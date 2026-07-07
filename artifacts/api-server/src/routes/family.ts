import { Router } from "express";
import { db } from "@workspace/db";
import {
  familiesTable,
  childrenTable,
  familyAgreementsTable,
  userProgressTable,
  profilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware.js";

const router = Router();
router.use(requireAuth as any);

// ── Family ────────────────────────────────────────────────────────────────────

// GET /api/family
router.get("/family", async (req: AuthRequest, res, next) => {
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

    const kids = await db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.family_id, fam.id));

    res.json({
      family: {
        id: fam.id,
        name: fam.name,
        parentId: fam.parent_id,
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
router.post("/family", async (req: AuthRequest, res, next) => {
  try {
    const { id, name } = req.body as { id: string; name: string };
    if (!id || !name?.trim()) {
      res.status(400).json({ error: "id and name required" });
      return;
    }

    await db
      .insert(familiesTable)
      .values({ id, name: name.trim(), parent_id: req.userId! })
      .onConflictDoUpdate({
        target: familiesTable.id,
        set: { name: name.trim() },
      });

    await db
      .update(profilesTable)
      .set({ family_id: id, updated_at: new Date() })
      .where(eq(profilesTable.id, req.userId!));

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Children ──────────────────────────────────────────────────────────────────

// POST /api/family/children
router.post("/family/children", async (req: AuthRequest, res, next) => {
  try {
    const { id, familyId, name, ageBand } = req.body as {
      id: string;
      familyId: string;
      name: string;
      ageBand: string;
    };

    if (!id || !familyId || !name?.trim()) {
      res.status(400).json({ error: "id, familyId, and name required" });
      return;
    }

    await db
      .insert(childrenTable)
      .values({ id, family_id: familyId, name: name.trim(), age_band: ageBand ?? "10-13" })
      .onConflictDoUpdate({
        target: childrenTable.id,
        set: { name: name.trim(), age_band: ageBand ?? "10-13" },
      });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/family/children/:childId
router.patch("/family/children/:childId", async (req: AuthRequest, res, next) => {
  try {
    const { name, ageBand } = req.body as { name?: string; ageBand?: string };
    const updates: Record<string, unknown> = {};
    if (name?.trim()) updates.name = name.trim();
    if (ageBand) updates.age_band = ageBand;

    await db
      .update(childrenTable)
      .set(updates)
      .where(eq(childrenTable.id, String(req.params.childId)));

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/family/children/:childId
router.delete("/family/children/:childId", async (req: AuthRequest, res, next) => {
  try {
    await db
      .delete(childrenTable)
      .where(eq(childrenTable.id, String(req.params.childId)));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Agreement ─────────────────────────────────────────────────────────────────

// GET /api/family/agreement
router.get("/family/agreement", async (req: AuthRequest, res, next) => {
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
router.put("/family/agreement", async (req: AuthRequest, res, next) => {
  try {
    const { id, familyId, rules, customRules, signedAt } = req.body as {
      id: string;
      familyId: string;
      rules: unknown[];
      customRules: string[];
      signedAt?: string | null;
    };

    if (!id || !familyId) {
      res.status(400).json({ error: "id and familyId required" });
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
router.get("/progress", async (req: AuthRequest, res, next) => {
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
router.put("/progress", async (req: AuthRequest, res, next) => {
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
