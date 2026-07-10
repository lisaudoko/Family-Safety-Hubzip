import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'crypto';
import { db } from '@workspace/db';
import {
  familiesTable,
  childrenTable,
  familyAgreementsTable,
  userProgressTable,
  profilesTable,
  supportCodesTable,
  auditLogTable,
} from '@workspace/db';
import { eq, and, desc, gte, lte, type SQL } from 'drizzle-orm';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import { isFamilyPremium } from '../lib/subscription.js';
import { logAuditEvent } from '../lib/audit.js';
import {
  getFamilyPolicy,
  updateFamilyPolicy,
  type FamilyPolicyInput,
} from '../services/familyPolicy.js';
import {
  getChildPolicy,
  updateChildPolicy,
  type ChildPolicyInput,
} from '../services/childPolicy.js';
import { familyPoliciesTable, childPoliciesTable } from '@workspace/db';

const router = Router();
router.use(requireAuth as any);

const PIN_REGEX = /^\d{4,6}$/;
const FREE_CHILD_LIMIT = 1;
const PREMIUM_CHILD_LIMIT = 6;

const FAMILY_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

function generateFamilyCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += FAMILY_CODE_CHARS[randomInt(FAMILY_CODE_CHARS.length)];
  }
  return code;
}

// ── Family ────────────────────────────────────────────────────────────────────

// GET /api/family
// Resolves the family via req.familyId (set by requireAuth) rather than
// re-deriving it from the caller's own profile row - this is what lets a
// support session (whose profile has no family of its own) see the family
// it was scoped to instead of always getting `family: null`.
router.get('/family', async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.json({ family: null });
      return;
    }

    const [family] = await db
      .select()
      .from(familiesTable)
      .where(eq(familiesTable.id, req.familyId))
      .limit(1);

    if (!family) {
      res.json({ family: null });
      return;
    }

    // Load all children in the family
    const children = await db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.family_id, family.id));

    // Load all parent profiles in the family
    const parents = await db
      .select({
        id: profilesTable.id,
        name: profilesTable.full_name,
      })
      .from(profilesTable)
      .where(
        and(
          eq(profilesTable.family_id, family.id),
          eq(profilesTable.role, 'parent'),
        ),
      );

    const mappedChildren = children.map((child) => ({
      id: child.id,
      name: child.name,
      ageBand: child.age_band,
      familyId: child.family_id,
      createdAt: child.created_at.toISOString(),
    }));

    // Siblings: same list as children, minus the caller when they are a child
    // themselves. Uses actorRole (the caller's real role) rather than the
    // possibly-overridden req.role, so an admin support session - whose
    // req.role is forced to 'parent' - still sees the unfiltered list.
    const siblings =
      req.actorRole === 'child'
        ? mappedChildren.filter((child) => child.id !== req.userId)
        : mappedChildren;

    res.json({
      family: {
        id: family.id,
        name: family.name,
        parentId: family.parent_id,
        familyCode: family.family_code,
        createdAt: family.created_at.toISOString(),
        parents,
        children: mappedChildren,
        siblings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/family
router.post('/family', requireParent, async (req: AuthRequest, res, next) => {
  try {
    const { id, name } = req.body as { id: string; name: string };
    if (!id || !name?.trim()) {
      res.status(400).json({ error: 'id and name required' });
      return;
    }

    const [existing] = await db
      .select({ family_code: familiesTable.family_code })
      .from(familiesTable)
      .where(eq(familiesTable.id, id))
      .limit(1);

    let inserted = false;
    let familyCode = existing?.family_code ?? '';
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      try {
        familyCode = existing?.family_code ?? generateFamilyCode();
        await db
          .insert(familiesTable)
          .values({ id, name: name.trim(), parent_id: req.userId!, family_code: familyCode })
          .onConflictDoUpdate({
            target: familiesTable.id,
            set: { name: name.trim() },
          });
        inserted = true;
      } catch (err: any) {
        if (err?.code !== '23505' || existing) throw err;
      }
    }

    await db
      .update(profilesTable)
      .set({ family_id: id, updated_at: new Date() })
      .where(eq(profilesTable.id, req.userId!));

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId: id,
      action: 'family_created',
      targetType: 'family',
      targetId: id,
      ip: req.ip,
      isSupportSession: req.isSupportSession,
    });

    res.json({ ok: true, familyCode });
  } catch (err) {
    next(err);
  }
});

// ── Children ──────────────────────────────────────────────────────────────────

// POST /api/family/children
router.post('/family/children', requireParent, async (req: AuthRequest, res, next) => {
  try {
    const { id, familyId, name, ageBand, pin } = req.body as {
      id: string;
      familyId: string;
      name: string;
      ageBand: string;
      pin?: string;
    };

    if (!id || !familyId || !name?.trim()) {
      res.status(400).json({ error: 'id, familyId, and name required' });
      return;
    }

    if (familyId !== req.familyId) {
      res.status(403).json({ error: 'Cannot add a child to another family' });
      return;
    }

    if (pin !== undefined && !PIN_REGEX.test(pin)) {
      res.status(400).json({ error: 'pin must be 4-6 digits' });
      return;
    }

    const existingChildren = await db
      .select({ id: childrenTable.id })
      .from(childrenTable)
      .where(eq(childrenTable.family_id, familyId));

    const isNewChild = !existingChildren.some((c) => c.id === id);
    if (isNewChild) {
      const premium = await isFamilyPremium(familyId);
      const limit = premium ? PREMIUM_CHILD_LIMIT : FREE_CHILD_LIMIT;
      if (existingChildren.length >= limit) {
        res.status(403).json({
          error: premium
            ? `Premium plans support up to ${PREMIUM_CHILD_LIMIT} child profiles`
            : 'Upgrade to Premium to add more than one child profile',
        });
        return;
      }
    }

    // A PIN isn't required from the caller (the current UI doesn't collect
    // one yet) - generate one server-side so the child still gets a real,
    // login-capable account, and return it once so a future UI can show it.
    const effectivePin = pin ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    const pinHash = await bcrypt.hash(effectivePin, 12);

    await db.transaction(async (tx) => {
      await tx
        .insert(profilesTable)
        .values({
          id,
          email: null,
          full_name: name.trim(),
          password_hash: pinHash,
          role: 'child',
          family_id: familyId,
          has_completed_onboarding: true,
        })
        .onConflictDoUpdate({
          target: profilesTable.id,
          set: { full_name: name.trim(), password_hash: pinHash, updated_at: new Date() },
        });

      await tx
        .insert(childrenTable)
        .values({ id, family_id: familyId, name: name.trim(), age_band: ageBand ?? '10-13' })
        .onConflictDoUpdate({
          target: childrenTable.id,
          set: { name: name.trim(), age_band: ageBand ?? '10-13' },
        });
    });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId,
      action: 'child_added',
      targetType: 'child',
      targetId: id,
      ip: req.ip,
      isSupportSession: req.isSupportSession,
    });

    res.json({ ok: true, pin: effectivePin });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/family/children/:childId
router.patch('/family/children/:childId', requireParent, async (req: AuthRequest, res, next) => {
  try {
    const { name, ageBand, pin } = req.body as { name?: string; ageBand?: string; pin?: string };

    if (pin !== undefined && !PIN_REGEX.test(pin)) {
      res.status(400).json({ error: 'pin must be 4-6 digits' });
      return;
    }

    const childId = String(req.params.childId);

    const [child] = await db
      .select({ id: childrenTable.id, family_id: childrenTable.family_id })
      .from(childrenTable)
      .where(eq(childrenTable.id, childId))
      .limit(1);

    if (!child || child.family_id !== req.familyId) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    const childUpdates: Record<string, unknown> = {};
    if (name?.trim()) childUpdates.name = name.trim();
    if (ageBand) childUpdates.age_band = ageBand;

    await db.transaction(async (tx) => {
      if (Object.keys(childUpdates).length > 0) {
        await tx.update(childrenTable).set(childUpdates).where(eq(childrenTable.id, childId));
      }

      const profileUpdates: Record<string, unknown> = { updated_at: new Date() };
      if (name?.trim()) profileUpdates.full_name = name.trim();
      if (pin) profileUpdates.password_hash = await bcrypt.hash(pin, 12);
      if (name?.trim() || pin) {
        await tx.update(profilesTable).set(profileUpdates).where(eq(profilesTable.id, childId));
      }
    });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId: req.familyId,
      action: 'child_updated',
      targetType: 'child',
      targetId: childId,
      ip: req.ip,
      isSupportSession: req.isSupportSession,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/family/children/:childId
router.delete('/family/children/:childId', requireParent, async (req: AuthRequest, res, next) => {
  try {
    const childId = String(req.params.childId);

    const [child] = await db
      .select({ id: childrenTable.id, family_id: childrenTable.family_id })
      .from(childrenTable)
      .where(eq(childrenTable.id, childId))
      .limit(1);

    if (!child || child.family_id !== req.familyId) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(childrenTable).where(eq(childrenTable.id, childId));
      await tx.delete(profilesTable).where(eq(profilesTable.id, childId));
    });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId: req.familyId,
      action: 'child_removed',
      targetType: 'child',
      targetId: childId,
      ip: req.ip,
      isSupportSession: req.isSupportSession,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Policies ──────────────────────────────────────────────────────────────────
// Storage of parent intent only - nothing enforces these server-side or
// on-device yet (see docs/POLICY_ENGINE.md). Mirrors the device_restrictions
// pattern (routes/devices.ts) at family and child scope instead of per-device.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeFamilyPolicy(r: typeof familyPoliciesTable.$inferSelect) {
  return {
    id: r.id,
    familyId: r.family_id,
    screenTimeLimitMinutes: r.screen_time_limit_minutes,
    bedtimeStart: r.bedtime_start,
    bedtimeEnd: r.bedtime_end,
    blockNewAppInstalls: r.block_new_app_installs,
    blockSafari: r.block_safari,
    blockExplicitContent: r.block_explicit_content,
    requireParentApproval: r.require_parent_approval,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function safeChildPolicy(r: typeof childPoliciesTable.$inferSelect) {
  return {
    id: r.id,
    childId: r.child_id,
    familyId: r.family_id,
    screenTimeLimitMinutes: r.screen_time_limit_minutes,
    bedtimeStart: r.bedtime_start,
    bedtimeEnd: r.bedtime_end,
    blockNewAppInstalls: r.block_new_app_installs,
    blockSafari: r.block_safari,
    blockExplicitContent: r.block_explicit_content,
    requireParentApproval: r.require_parent_approval,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function validatePolicyPatch(
  body: unknown
): { data?: FamilyPolicyInput | ChildPolicyInput; error?: string } {
  if (!isPlainObject(body)) {
    return { error: 'request body must be a JSON object' };
  }

  const data: FamilyPolicyInput = {};
  const b = body;

  if ('screenTimeLimitMinutes' in b) {
    if (b.screenTimeLimitMinutes !== null && typeof b.screenTimeLimitMinutes !== 'number') {
      return { error: 'screenTimeLimitMinutes must be a number or null' };
    }
    data.screen_time_limit_minutes = b.screenTimeLimitMinutes as number | null;
  }
  if ('bedtimeStart' in b) {
    if (b.bedtimeStart !== null && typeof b.bedtimeStart !== 'string') {
      return { error: 'bedtimeStart must be a string or null' };
    }
    data.bedtime_start = b.bedtimeStart as string | null;
  }
  if ('bedtimeEnd' in b) {
    if (b.bedtimeEnd !== null && typeof b.bedtimeEnd !== 'string') {
      return { error: 'bedtimeEnd must be a string or null' };
    }
    data.bedtime_end = b.bedtimeEnd as string | null;
  }
  if ('blockNewAppInstalls' in b) {
    if (typeof b.blockNewAppInstalls !== 'boolean') {
      return { error: 'blockNewAppInstalls must be a boolean' };
    }
    data.block_new_app_installs = b.blockNewAppInstalls;
  }
  if ('blockSafari' in b) {
    if (typeof b.blockSafari !== 'boolean') {
      return { error: 'blockSafari must be a boolean' };
    }
    data.block_safari = b.blockSafari;
  }
  if ('blockExplicitContent' in b) {
    if (typeof b.blockExplicitContent !== 'boolean') {
      return { error: 'blockExplicitContent must be a boolean' };
    }
    data.block_explicit_content = b.blockExplicitContent;
  }
  if ('requireParentApproval' in b) {
    if (typeof b.requireParentApproval !== 'boolean') {
      return { error: 'requireParentApproval must be a boolean' };
    }
    data.require_parent_approval = b.requireParentApproval;
  }

  return { data };
}

// GET /api/family/policy
router.get('/family/policy', requireParent, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.json({ policy: null });
      return;
    }

    const policy = await getFamilyPolicy(req.familyId);
    res.json({ policy: policy ? safeFamilyPolicy(policy) : null });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/family/policy
router.patch('/family/policy', requireParent, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.status(400).json({ error: 'join or create a family first' });
      return;
    }

    const { data, error } = validatePolicyPatch(req.body);
    if (error || !data) {
      res.status(400).json({ error });
      return;
    }

    const policy = await updateFamilyPolicy(req.familyId, data);
    res.json({ policy: safeFamilyPolicy(policy) });
  } catch (err) {
    next(err);
  }
});

// GET /api/family/children/:childId/policy
router.get(
  '/family/children/:childId/policy',
  requireParent,
  async (req: AuthRequest, res, next) => {
    try {
      const childId = String(req.params.childId);

      const [child] = await db
        .select({ id: childrenTable.id, family_id: childrenTable.family_id })
        .from(childrenTable)
        .where(eq(childrenTable.id, childId))
        .limit(1);

      if (!child || child.family_id !== req.familyId) {
        res.status(404).json({ error: 'Child not found' });
        return;
      }

      const policy = await getChildPolicy(childId, req.familyId!);
      res.json({ policy: policy ? safeChildPolicy(policy) : null });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/family/children/:childId/policy
router.patch(
  '/family/children/:childId/policy',
  requireParent,
  async (req: AuthRequest, res, next) => {
    try {
      const childId = String(req.params.childId);

      const { data, error } = validatePolicyPatch(req.body);
      if (error || !data) {
        res.status(400).json({ error });
        return;
      }

      const policy = await updateChildPolicy(childId, req.familyId!, data);
      if (!policy) {
        res.status(404).json({ error: 'Child not found' });
        return;
      }

      res.json({ policy: safeChildPolicy(policy) });
    } catch (err) {
      next(err);
    }
  }
);

// ── Agreement ─────────────────────────────────────────────────────────────────

// GET /api/family/agreement
router.get('/family/agreement', async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.json({ agreement: null });
      return;
    }

    const [agr] = await db
      .select()
      .from(familyAgreementsTable)
      .where(eq(familyAgreementsTable.family_id, req.familyId))
      .limit(1);

    if (!agr) {
      res.json({ agreement: null });
      return;
    }

    res.json({
      agreement: {
        id: agr.id,
        familyId: agr.family_id,
        rules: agr.rules,
        customRules: agr.custom_rules,
        signedAt: agr.signed_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/family/agreement
router.put('/family/agreement', requireParent, async (req: AuthRequest, res, next) => {
  try {
    const { id, familyId, rules, customRules, signedAt } = req.body as {
      id: string;
      familyId: string;
      rules: unknown[];
      customRules: string[];
      signedAt?: string | null;
    };

    if (!id || !familyId) {
      res.status(400).json({ error: 'id and familyId required' });
      return;
    }

    if (familyId !== req.familyId) {
      res.status(403).json({ error: 'Cannot modify another family\'s agreement' });
      return;
    }

    await db
      .insert(familyAgreementsTable)
      .values({
        id,
        family_id: familyId,
        rules: rules ?? [],
        custom_rules: customRules ?? [],
        signed_at: signedAt ?? null,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: familyAgreementsTable.family_id,
        set: {
          rules: rules ?? [],
          custom_rules: customRules ?? [],
          signed_at: signedAt ?? null,
          updated_at: new Date(),
        },
      });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId,
      action: 'agreement_updated',
      targetType: 'family_agreement',
      targetId: id,
      ip: req.ip,
      isSupportSession: req.isSupportSession,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Support access ────────────────────────────────────────────────────────────

const SUPPORT_CODE_TTL_MINUTES = 30;
const SUPPORT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

function generateSupportCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += SUPPORT_CODE_CHARS[randomInt(SUPPORT_CODE_CHARS.length)];
  }
  return code;
}

// POST /api/family/support-code
// Mints a short-lived, single-use code the parent reads out to Digital
// Village support so an admin can redeem it (POST /api/admin/support-sessions)
// for temporary, fully-logged access to this family's account.
router.post('/family/support-code', requireParent, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.status(400).json({ error: 'join or create a family first' });
      return;
    }

    const code = generateSupportCode();
    const codeHash = await bcrypt.hash(code, 12);
    const expiresAt = new Date(Date.now() + SUPPORT_CODE_TTL_MINUTES * 60_000);
    const id = randomUUID();

    await db.insert(supportCodesTable).values({
      id,
      family_id: req.familyId,
      created_by: req.userId!,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId: req.familyId,
      action: 'support_code_created',
      targetType: 'support_code',
      targetId: id,
      ip: req.ip,
    });

    res.status(201).json({ code, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── Audit log ─────────────────────────────────────────────────────────────────

const AUDIT_LOG_DEFAULT_LIMIT = 50;
const AUDIT_LOG_MAX_LIMIT = 100;

// GET /api/audit-log
// Family-scoped security event history (auth events, family/agreement
// changes, billing, and any admin support-session access) for the parent to
// review. Mirrors GET /devices/events' filtering/pagination shape.
router.get('/audit-log', requireParent, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.json({ events: [], limit: AUDIT_LOG_DEFAULT_LIMIT, offset: 0 });
      return;
    }

    const { from, to } = req.query as { from?: unknown; to?: unknown };
    if (from !== undefined && typeof from !== 'string') {
      res.status(400).json({ error: 'from must be a valid ISO date string' });
      return;
    }
    if (to !== undefined && typeof to !== 'string') {
      res.status(400).json({ error: 'to must be a valid ISO date string' });
      return;
    }

    let fromDate: Date | undefined;
    if (from !== undefined) {
      fromDate = new Date(from);
      if (Number.isNaN(fromDate.getTime())) {
        res.status(400).json({ error: 'from must be a valid ISO date string' });
        return;
      }
    }

    let toDate: Date | undefined;
    if (to !== undefined) {
      toDate = new Date(to);
      if (Number.isNaN(toDate.getTime())) {
        res.status(400).json({ error: 'to must be a valid ISO date string' });
        return;
      }
    }

    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), AUDIT_LOG_MAX_LIMIT)
        : AUDIT_LOG_DEFAULT_LIMIT;

    const rawOffset = Number(req.query.offset);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;

    const conditions: SQL[] = [eq(auditLogTable.family_id, req.familyId)];
    if (fromDate) conditions.push(gte(auditLogTable.created_at, fromDate));
    if (toDate) conditions.push(lte(auditLogTable.created_at, toDate));

    const rows = await db
      .select()
      .from(auditLogTable)
      .where(and(...conditions))
      .orderBy(desc(auditLogTable.created_at))
      .limit(limit)
      .offset(offset);

    res.json({
      events: rows.map((r) => ({
        id: r.id,
        actorId: r.actor_id,
        actorRole: r.actor_role,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id,
        metadata: r.metadata,
        isSupportSession: r.is_support_session,
        createdAt: r.created_at.toISOString(),
      })),
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

// ── Progress ──────────────────────────────────────────────────────────────────

// GET /api/progress
router.get('/progress', async (req: AuthRequest, res, next) => {
  try {
    const [prog] = await db
      .select()
      .from(userProgressTable)
      .where(eq(userProgressTable.user_id, req.userId!))
      .limit(1);

    if (!prog) {
      res.json({ progress: null });
      return;
    }

    res.json({
      progress: {
        completedLessons: prog.completed_lessons,
        completedQuizzes: prog.completed_quizzes,
        courseProgress: prog.course_progress,
        completedChallenges: prog.completed_challenges,
        activeChallenges: prog.active_challenges,
        earnedBadges: prog.earned_badges,
        assessmentScore: prog.assessment_score,
        assessmentCompletedAt: prog.assessment_completed_at,
        assessmentResults: prog.assessment_results,
        challengeSteps: prog.challenge_steps,
        weeklyTipIndex: prog.weekly_tip_index,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/progress
router.put('/progress', async (req: AuthRequest, res, next) => {
  try {
    const p = req.body as {
      completedLessons?: string[];
      completedQuizzes?: string[];
      courseProgress?: Record<string, number>;
      completedChallenges?: string[];
      activeChallenges?: string[];
      earnedBadges?: string[];
      assessmentScore?: number | null;
      assessmentCompletedAt?: string | null;
      assessmentResults?: Record<string, unknown>;
      challengeSteps?: Record<string, number[]>;
      weeklyTipIndex?: number;
    };

    await db
      .insert(userProgressTable)
      .values({
        user_id: req.userId!,
        completed_lessons: p.completedLessons ?? [],
        completed_quizzes: p.completedQuizzes ?? [],
        course_progress: p.courseProgress ?? {},
        completed_challenges: p.completedChallenges ?? [],
        active_challenges: p.activeChallenges ?? [],
        earned_badges: p.earnedBadges ?? [],
        assessment_score: p.assessmentScore ?? null,
        assessment_completed_at: p.assessmentCompletedAt ?? null,
        assessment_results: p.assessmentResults ?? {},
        challenge_steps: p.challengeSteps ?? {},
        weekly_tip_index: p.weeklyTipIndex ?? 0,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: userProgressTable.user_id,
        set: {
          completed_lessons: p.completedLessons ?? [],
          completed_quizzes: p.completedQuizzes ?? [],
          course_progress: p.courseProgress ?? {},
          completed_challenges: p.completedChallenges ?? [],
          active_challenges: p.activeChallenges ?? [],
          earned_badges: p.earnedBadges ?? [],
          assessment_score: p.assessmentScore ?? null,
          assessment_completed_at: p.assessmentCompletedAt ?? null,
          assessment_results: p.assessmentResults ?? {},
          challenge_steps: p.challengeSteps ?? {},
          weekly_tip_index: p.weeklyTipIndex ?? 0,
          updated_at: new Date(),
        },
      });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
