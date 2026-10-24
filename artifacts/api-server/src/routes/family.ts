import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { db } from '@workspace/db';
import {
  familiesTable,
  childrenTable,
  familyAgreementsTable,
  userProgressTable,
  profilesTable,
} from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import { isFamilyPremium } from '../lib/subscription.js';

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
router.get('/family', async (req: AuthRequest, res, next) => {
  try {
    const [fam] = await db
      .select()
      .from(familiesTable)
      .where(eq(familiesTable.parent_id, req.userId!))
      .limit(1);

    if (!fam) {
      res.json({ family: null });
      return;
    }

    const kids = await db.select().from(childrenTable).where(eq(childrenTable.family_id, fam.id));

    res.json({
      family: {
        id: fam.id,
        name: fam.name,
        parentId: fam.parent_id,
        familyCode: fam.family_code,
        createdAt: fam.created_at.toISOString(),
        children: kids.map((k) => ({
          id: k.id,
          name: k.name,
          ageBand: k.age_band,
          familyId: k.family_id,
          createdAt: k.created_at.toISOString(),
        })),
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

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/family/children/:childId
router.delete('/family/children/:childId', requireParent, async (req: AuthRequest, res, next) => {
  try {
    const childId = String(req.params.childId);
    await db.transaction(async (tx) => {
      await tx.delete(childrenTable).where(eq(childrenTable.id, childId));
      await tx.delete(profilesTable).where(eq(profilesTable.id, childId));
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Agreement ─────────────────────────────────────────────────────────────────

// GET /api/family/agreement
router.get('/family/agreement', async (req: AuthRequest, res, next) => {
  try {
    const [fam] = await db
      .select({ id: familiesTable.id })
      .from(familiesTable)
      .where(eq(familiesTable.parent_id, req.userId!))
      .limit(1);

    if (!fam) {
      res.json({ agreement: null });
      return;
    }

    const [agr] = await db
      .select()
      .from(familyAgreementsTable)
      .where(eq(familyAgreementsTable.family_id, fam.id))
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
router.put('/family/agreement', async (req: AuthRequest, res, next) => {
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

    res.json({ ok: true });
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
