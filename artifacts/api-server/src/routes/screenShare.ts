import { Router, type IRouter, type Response } from 'express';
import { randomUUID } from 'crypto';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { childrenTable, db, profilesTable, screenShareRequestsTable, type ScreenShareRequest } from '@workspace/db';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import { logAuditEvent } from '../lib/audit.js';
import { endLiveKitRoom, liveKitConfig, mintScreenShareToken } from '../lib/livekit.js';
import { notifyParents, notifyUser } from '../lib/push.js';

// Consent-based live screen viewing (docs/SCREEN_MIRRORING_PLAN.md).
// A parent requests -> the child accepts or declines -> while accepted, the
// child publishes only a screen track and the parent can only watch. Nothing
// is recorded. Every route is gated per route (not router.use) so other
// routers' requests are unaffected.

export const REQUEST_TTL_MS = 2 * 60 * 1000; // child must answer within 2 minutes
export const SESSION_MAX_MS = 15 * 60 * 1000; // a session ends after 15 minutes
export const MAX_REQUESTS_PER_HOUR = 5; // per child, to prevent pestering

const router: IRouter = Router();

type Status = 'requested' | 'accepted' | 'declined' | 'expired' | 'ended';

// Requests and sessions expire by time; compute the real status on read.
function effectiveStatus(r: ScreenShareRequest, now = new Date()): Status {
  if (r.status === 'requested' && r.expires_at <= now) return 'expired';
  if (r.status === 'accepted' && r.session_ends_at && r.session_ends_at <= now) return 'ended';
  return r.status as Status;
}

function toApi(r: ScreenShareRequest) {
  return {
    id: r.id,
    childId: r.child_id,
    parentId: r.parent_id,
    status: effectiveStatus(r),
    expiresAt: r.expires_at.toISOString(),
    sessionEndsAt: r.session_ends_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  };
}

async function loadRequest(id: string): Promise<ScreenShareRequest | undefined> {
  const [r] = await db.select().from(screenShareRequestsTable).where(eq(screenShareRequestsTable.id, id)).limit(1);
  return r;
}

// The parent side: any parent of the request's family (including the requester).
function isFamilyParent(req: AuthRequest, r: ScreenShareRequest): boolean {
  return req.role === 'parent' && req.familyId === r.family_id;
}
function isTheChild(req: AuthRequest, r: ScreenShareRequest): boolean {
  return req.role === 'child' && req.userId === r.child_id && !req.isSupportSession;
}

function notConfigured(res: Response): boolean {
  if (liveKitConfig()) return false;
  res.status(503).json({ error: 'Screen viewing is not available right now' });
  return true;
}

async function displayName(userId: string): Promise<string> {
  const [p] = await db.select({ name: profilesTable.full_name }).from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
  return p?.name ?? 'Your parent';
}

// POST /api/screen-share/requests  { childId }
router.post('/screen-share/requests', requireAuth as any, requireParent as any, async (req: AuthRequest, res, next) => {
  try {
    if (notConfigured(res)) return;
    if (req.isSupportSession) {
      res.status(403).json({ error: 'Not available during a support session' });
      return;
    }
    const childId = typeof req.body?.childId === 'string' ? req.body.childId : '';
    const [child] = childId
      ? await db.select().from(childrenTable).where(eq(childrenTable.id, childId)).limit(1)
      : [];
    if (!child || child.family_id !== req.familyId) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    const now = new Date();
    const recent = await db
      .select()
      .from(screenShareRequestsTable)
      .where(
        and(
          eq(screenShareRequestsTable.child_id, childId),
          gte(screenShareRequestsTable.created_at, new Date(now.getTime() - 60 * 60 * 1000)),
        ),
      )
      .orderBy(desc(screenShareRequestsTable.created_at));

    const open = recent.find((r) => ['requested', 'accepted'].includes(effectiveStatus(r, now)));
    if (open) {
      res.status(409).json({ error: 'There is already an open request for this child', request: toApi(open) });
      return;
    }
    if (recent.length >= MAX_REQUESTS_PER_HOUR) {
      res.status(429).json({ error: 'Too many screen requests for this child. Please try again later.' });
      return;
    }

    const id = randomUUID();
    const [created] = await db
      .insert(screenShareRequestsTable)
      .values({
        id,
        family_id: child.family_id,
        parent_id: req.userId!,
        child_id: childId,
        status: 'requested',
        room: `screen_${id}`,
        expires_at: new Date(now.getTime() + REQUEST_TTL_MS),
      })
      .returning();

    const parentName = await displayName(req.userId!);
    void notifyUser(childId, {
      title: `${parentName} wants to see your screen`,
      body: 'Open Digital Village to accept or decline.',
      url: `/screen-share/${id}`,
    });
    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId: req.familyId,
      action: 'screen_share_requested',
      targetType: 'child',
      targetId: childId,
      metadata: { requestId: id },
      ip: req.ip,
    });

    res.status(201).json({ request: toApi(created!) });
  } catch (err) {
    next(err);
  }
});

// GET /api/screen-share/active
// Child: their open request or session (checked when the app opens, in case a
// push was missed). Parent: the family's open requests and sessions.
router.get('/screen-share/active', requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const where =
      req.role === 'child'
        ? eq(screenShareRequestsTable.child_id, req.userId!)
        : eq(screenShareRequestsTable.family_id, req.familyId ?? '');
    const rows = await db
      .select()
      .from(screenShareRequestsTable)
      .where(and(where, inArray(screenShareRequestsTable.status, ['requested', 'accepted'])))
      .orderBy(desc(screenShareRequestsTable.created_at))
      .limit(20);
    const open = rows.filter((r) => ['requested', 'accepted'].includes(effectiveStatus(r, now)));
    res.json({ requests: open.map(toApi) });
  } catch (err) {
    next(err);
  }
});

// GET /api/screen-share/requests/:id
router.get('/screen-share/requests/:id', requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const r = await loadRequest(String(req.params.id));
    if (!r || !(isFamilyParent(req, r) || isTheChild(req, r))) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    res.json({ request: toApi(r) });
  } catch (err) {
    next(err);
  }
});

// POST /api/screen-share/requests/:id/accept  (the child)
// Returns the child's publish-only token.
router.post('/screen-share/requests/:id/accept', requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    if (notConfigured(res)) return;
    const cfg = liveKitConfig()!;
    const r = await loadRequest(String(req.params.id));
    if (!r || !isTheChild(req, r)) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const now = new Date();
    if (effectiveStatus(r, now) !== 'requested') {
      res.status(410).json({ error: 'This request is no longer open', request: toApi(r) });
      return;
    }
    const sessionEndsAt = new Date(now.getTime() + SESSION_MAX_MS);
    const [updated] = await db
      .update(screenShareRequestsTable)
      .set({ status: 'accepted', responded_at: now, session_ends_at: sessionEndsAt })
      .where(and(eq(screenShareRequestsTable.id, r.id), eq(screenShareRequestsTable.status, 'requested')))
      .returning();
    if (!updated) {
      res.status(410).json({ error: 'This request is no longer open' });
      return;
    }

    const childName = await displayName(r.child_id);
    const token = await mintScreenShareToken(cfg, {
      room: r.room,
      identity: `child:${r.child_id}`,
      name: childName,
      role: 'publisher',
      ttlSeconds: SESSION_MAX_MS / 1000,
    });

    void notifyParents(r.family_id, {
      title: `${childName} accepted`,
      body: 'Tap to see their screen.',
      url: `/screen-share/${r.id}`,
    });
    void logAuditEvent({
      actorId: req.userId!,
      actorRole: 'child',
      familyId: r.family_id,
      action: 'screen_share_accepted',
      targetType: 'screen_share',
      targetId: r.id,
      ip: req.ip,
    });

    res.json({ request: toApi(updated), livekit: { url: cfg.url, room: r.room, token } });
  } catch (err) {
    next(err);
  }
});

// POST /api/screen-share/requests/:id/decline  (the child)
router.post('/screen-share/requests/:id/decline', requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const r = await loadRequest(String(req.params.id));
    if (!r || !isTheChild(req, r)) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const now = new Date();
    if (effectiveStatus(r, now) !== 'requested') {
      res.status(410).json({ error: 'This request is no longer open', request: toApi(r) });
      return;
    }
    const [updated] = await db
      .update(screenShareRequestsTable)
      .set({ status: 'declined', responded_at: now })
      .where(and(eq(screenShareRequestsTable.id, r.id), eq(screenShareRequestsTable.status, 'requested')))
      .returning();

    const childName = await displayName(r.child_id);
    void notifyParents(r.family_id, { title: `${childName} declined`, body: "They chose not to share their screen right now." });
    void logAuditEvent({
      actorId: req.userId!,
      actorRole: 'child',
      familyId: r.family_id,
      action: 'screen_share_declined',
      targetType: 'screen_share',
      targetId: r.id,
      ip: req.ip,
    });
    res.json({ request: toApi(updated ?? r) });
  } catch (err) {
    next(err);
  }
});

// POST /api/screen-share/requests/:id/viewer-token  (a parent of the family)
// Watch-only token, available once the child has accepted.
router.post('/screen-share/requests/:id/viewer-token', requireAuth as any, requireParent as any, async (req: AuthRequest, res, next) => {
  try {
    if (notConfigured(res)) return;
    const cfg = liveKitConfig()!;
    const r = await loadRequest(String(req.params.id));
    if (!r || !isFamilyParent(req, r) || req.isSupportSession) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const now = new Date();
    const status = effectiveStatus(r, now);
    if (status === 'requested') {
      res.status(409).json({ error: 'Waiting for your child to accept', request: toApi(r) });
      return;
    }
    if (status !== 'accepted' || !r.session_ends_at) {
      res.status(410).json({ error: 'This session is not active', request: toApi(r) });
      return;
    }
    const token = await mintScreenShareToken(cfg, {
      room: r.room,
      identity: `parent:${req.userId}`,
      name: await displayName(req.userId!),
      role: 'viewer',
      ttlSeconds: (r.session_ends_at.getTime() - now.getTime()) / 1000,
    });
    res.json({ request: toApi(r), livekit: { url: cfg.url, room: r.room, token } });
  } catch (err) {
    next(err);
  }
});

// POST /api/screen-share/requests/:id/end  (the child or a parent of the family)
router.post('/screen-share/requests/:id/end', requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const r = await loadRequest(String(req.params.id));
    if (!r || !(isFamilyParent(req, r) || isTheChild(req, r))) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const now = new Date();
    const status = effectiveStatus(r, now);
    if (status === 'requested' || status === 'accepted') {
      const [updated] = await db
        .update(screenShareRequestsTable)
        .set({ status: 'ended', ended_at: now, end_reason: req.role === 'child' ? 'child' : 'parent' })
        .where(eq(screenShareRequestsTable.id, r.id))
        .returning();
      const cfg = liveKitConfig();
      if (cfg) endLiveKitRoom(cfg, r.room);
      void logAuditEvent({
        actorId: req.userId!,
        actorRole: req.actorRole!,
        familyId: r.family_id,
        action: 'screen_share_ended',
        targetType: 'screen_share',
        targetId: r.id,
        ip: req.ip,
        isSupportSession: req.isSupportSession,
      });
      res.json({ request: toApi(updated ?? r) });
      return;
    }
    res.json({ request: toApi(r) });
  } catch (err) {
    next(err);
  }
});

export default router;
