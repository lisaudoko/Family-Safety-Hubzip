import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  profilesTable,
  sessionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware.js";

const router = Router();

const SESSION_TTL_DAYS = 90;

function sessionExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_TTL_DAYS);
  return d;
}

function safeUser(p: typeof profilesTable.$inferSelect) {
  return {
    id: p.id,
    email: p.email,
    name: p.full_name,
    role: p.role,
    isPremium: p.subscription_tier === "premium",
    familyId: p.family_id ?? "",
    hasCompletedOnboarding: p.has_completed_onboarding,
    createdAt: p.created_at.toISOString(),
  };
}

// POST /api/auth/register
router.post("/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: "name, email, and password (min 6 chars) required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = randomUUID();

    const [profile] = await db
      .insert(profilesTable)
      .values({
        id,
        email: normalizedEmail,
        full_name: name.trim(),
        password_hash: passwordHash,
        role: "parent",
        subscription_tier: "free",
        has_completed_onboarding: false,
      })
      .returning();

    const token = randomUUID();
    await db.insert(sessionsTable).values({
      token,
      user_id: id,
      expires_at: sessionExpiry(),
    });

    res.status(201).json({ token, user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.email, normalizedEmail))
      .limit(1);

    if (!profile) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = randomUUID();
    await db.insert(sessionsTable).values({
      token,
      user_id: profile.id,
      expires_at: sessionExpiry(),
    });

    res.json({ token, user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/auth/logout", requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const header = req.headers.authorization!;
    const token = header.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/auth/me", requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me
router.patch("/auth/me", requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    const updates: Partial<typeof profilesTable.$inferInsert> = {
      updated_at: new Date(),
    };
    if (name?.trim()) updates.full_name = name.trim();
    if (email?.trim()) updates.email = email.trim().toLowerCase();

    const [profile] = await db
      .update(profilesTable)
      .set(updates)
      .where(eq(profilesTable.id, req.userId!))
      .returning();

    res.json({ user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/onboarding
router.patch("/auth/onboarding", requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const [profile] = await db
      .update(profilesTable)
      .set({ has_completed_onboarding: true, updated_at: new Date() })
      .where(eq(profilesTable.id, req.userId!))
      .returning();

    res.json({ user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/upgrade
router.patch("/auth/upgrade", requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const [profile] = await db
      .update(profilesTable)
      .set({ subscription_tier: "premium", updated_at: new Date() })
      .where(eq(profilesTable.id, req.userId!))
      .returning();

    res.json({ user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

export default router;
