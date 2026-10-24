import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@workspace/db';
import { supportCodesTable, supportSessionsTable, sessionsTable } from '@workspace/db';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { requireAuth, requireAdmin, type AuthRequest } from '../lib/auth-middleware.js';
import { logAuditEvent } from '../lib/audit.js';

// Gated per-route (requireAuth, requireAdmin), not blanket via router.use() -
// a blanket router.use() would run for every request that reaches this
// router regardless of path match, which would 403 unrelated requests like
// /dashboard/* or /notifications/* if this router is ever mounted ahead of
// them (see the ordering note in routes/index.ts).
const router = Router();

const SUPPORT_SESSION_TTL_MINUTES = 60;

// POST /api/admin/support-sessions
// Redeems a parent-minted support code (POST /api/family/support-code) for a
// new, time-boxed session token scoped to that family. The returned token is
// used as a normal Bearer token for subsequent requests - requireAuth
// resolves it to the target family and treats the caller as that family's
// parent for authorization, while attributing every action to this admin.
router.post('/admin/support-sessions', requireAuth as any, requireAdmin as any, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) {
      res.status(400).json({ error: 'code required' });
      return;
    }

    const invalidCodeError = () => res.status(400).json({ error: 'Invalid or expired code' });

    const candidates = await db
      .select()
      .from(supportCodesTable)
      .where(and(isNull(supportCodesTable.used_at), gt(supportCodesTable.expires_at, new Date())));

    let matched: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(code, candidate.code_hash)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      invalidCodeError();
      return;
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SUPPORT_SESSION_TTL_MINUTES * 60_000);

    await db.transaction(async (tx) => {
      await tx
        .update(supportCodesTable)
        .set({ used_at: new Date(), used_by: req.userId! })
        .where(eq(supportCodesTable.id, matched!.id));

      await tx.insert(supportSessionsTable).values({
        id: sessionId,
        family_id: matched!.family_id,
        admin_id: req.userId!,
        code_id: matched!.id,
        expires_at: expiresAt,
      });
    });

    const token = randomUUID();
    await db.insert(sessionsTable).values({
      token,
      user_id: req.userId!,
      expires_at: expiresAt,
      support_session_id: sessionId,
    });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: 'admin',
      familyId: matched.family_id,
      action: 'support_session_started',
      targetType: 'support_session',
      targetId: sessionId,
      ip: req.ip,
      isSupportSession: true,
    });

    res.status(201).json({ token, sessionId, familyId: matched.family_id, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/support-sessions/:id/end
router.post('/admin/support-sessions/:id/end', requireAuth as any, requireAdmin as any, async (req: AuthRequest, res, next) => {
  try {
    const sessionId = String(req.params.id);
    const [supportSession] = await db
      .select()
      .from(supportSessionsTable)
      .where(eq(supportSessionsTable.id, sessionId))
      .limit(1);

    if (!supportSession || supportSession.admin_id !== req.userId) {
      res.status(404).json({ error: 'Support session not found' });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(supportSessionsTable)
        .set({ ended_at: new Date() })
        .where(eq(supportSessionsTable.id, sessionId));
      await tx.delete(sessionsTable).where(eq(sessionsTable.support_session_id, sessionId));
    });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: 'admin',
      familyId: supportSession.family_id,
      action: 'support_session_ended',
      targetType: 'support_session',
      targetId: sessionId,
      ip: req.ip,
      isSupportSession: true,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
