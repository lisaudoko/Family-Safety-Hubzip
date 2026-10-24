import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { randomInt, randomUUID } from 'crypto';
import { db } from '@workspace/db';
import {
  childrenTable,
  emailVerificationCodesTable,
  familiesTable,
  passwordResetCodesTable,
  profilesTable,
  sessionsTable,
} from '@workspace/db';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../lib/auth-middleware.js';
import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../lib/email.js';
import { logAuditEvent } from '../lib/audit.js';

const router = Router();

// Sends a real outbound email, so this needs a tighter cap than the global
// API limiter to prevent inbox spam / SMTP quota exhaustion (same pattern as
// notifications.ts digestSendLimiter).
const verificationResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthRequest) => req.userId ?? ipKeyGenerator(req.ip ?? 'unknown'),
});

const SESSION_TTL_DAYS = 90;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    isPremium: p.subscription_tier === 'premium',
    familyId: p.family_id ?? '',
    hasCompletedOnboarding: p.has_completed_onboarding,
    emailVerified: p.email_verified,
    createdAt: p.created_at.toISOString(),
  };
}

const VERIFICATION_CODE_TTL_MINUTES = 15;

async function issueEmailVerificationCode(userId: string, email: string): Promise<void> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60_000);

  await db.insert(emailVerificationCodesTable).values({
    id: randomUUID(),
    user_id: userId,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  await sendEmailVerificationEmail(email, code);
}

// POST /api/auth/register
router.post('/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: 'name, email, and password (min 6 chars) required' });
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
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
        role: 'parent',
        subscription_tier: 'free',
        has_completed_onboarding: false,
      })
      .returning();

    const token = randomUUID();
    await db.insert(sessionsTable).values({
      token,
      user_id: id,
      expires_at: sessionExpiry(),
    });

    void logAuditEvent({
      actorId: id,
      actorRole: 'parent',
      action: 'register',
      ip: req.ip,
    });

    // Best-effort - do not fail registration if the verification email
    // can't be sent (e.g. SMTP misconfiguration). Verification is
    // informational only today; see docs/ACCOUNT_MODEL.md.
    try {
      await issueEmailVerificationCode(id, normalizedEmail);
      void logAuditEvent({
        actorId: id,
        actorRole: 'parent',
        action: 'email_verification_requested',
        ip: req.ip,
      });
    } catch (emailErr) {
      req.log.error({ err: emailErr }, 'failed to send registration verification email');
    }

    res.status(201).json({ token, user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.email, normalizedEmail))
      .limit(1);

    if (!profile) {
      void logAuditEvent({
        actorRole: 'unknown',
        action: 'login_failed',
        metadata: { email: normalizedEmail },
        ip: req.ip,
      });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) {
      void logAuditEvent({
        actorId: profile.id,
        actorRole: profile.role,
        familyId: profile.family_id,
        action: 'login_failed',
        ip: req.ip,
      });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = randomUUID();
    await db.insert(sessionsTable).values({
      token,
      user_id: profile.id,
      expires_at: sessionExpiry(),
    });

    void logAuditEvent({
      actorId: profile.id,
      actorRole: profile.role,
      familyId: profile.family_id,
      action: 'login',
      ip: req.ip,
    });

    res.json({ token, user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/family-by-code/:code
// Public lookup used by the child-login screen: given the family's join
// code, list the children a kid can pick from (no PINs or parent details).
router.get('/auth/family-by-code/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code).trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'code required' });
      return;
    }

    const [family] = await db
      .select({ id: familiesTable.id, name: familiesTable.name })
      .from(familiesTable)
      .where(eq(familiesTable.family_code, code))
      .limit(1);

    if (!family) {
      res.status(404).json({ error: 'Family not found' });
      return;
    }

    const kids = await db
      .select({ id: childrenTable.id, name: childrenTable.name })
      .from(childrenTable)
      .innerJoin(profilesTable, eq(profilesTable.id, childrenTable.id))
      .where(eq(childrenTable.family_id, family.id));

    res.json({
      family: { name: family.name },
      children: kids,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/child-login
router.post('/auth/child-login', async (req, res, next) => {
  try {
    const { childId, pin } = req.body as {
      childId?: string;
      pin?: string;
    };

    if (!childId?.trim() || !pin) {
      res.status(400).json({ error: 'childId and pin required' });
      return;
    }

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, childId.trim()))
      .limit(1);

    if (!profile || profile.role !== 'child') {
      void logAuditEvent({
        actorId: profile?.id,
        actorRole: 'unknown',
        familyId: profile?.family_id,
        action: 'child_login_failed',
        metadata: { childId: childId.trim() },
        ip: req.ip,
      });
      res.status(401).json({ error: 'Invalid child or PIN' });
      return;
    }

    const valid = await bcrypt.compare(pin, profile.password_hash);
    if (!valid) {
      void logAuditEvent({
        actorId: profile.id,
        actorRole: 'child',
        familyId: profile.family_id,
        action: 'child_login_failed',
        ip: req.ip,
      });
      res.status(401).json({ error: 'Invalid child or PIN' });
      return;
    }

    const token = randomUUID();
    await db.insert(sessionsTable).values({
      token,
      user_id: profile.id,
      expires_at: sessionExpiry(),
    });

    void logAuditEvent({
      actorId: profile.id,
      actorRole: 'child',
      familyId: profile.family_id,
      action: 'child_login',
      ip: req.ip,
    });

    res.json({ token, user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

const RESET_CODE_TTL_MINUTES = 15;

// POST /api/auth/forgot-password
router.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      res.status(400).json({ error: 'email required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [profile] = await db
      .select({ id: profilesTable.id, email: profilesTable.email })
      .from(profilesTable)
      .where(eq(profilesTable.email, normalizedEmail))
      .limit(1);

    // Always respond the same way whether or not the account exists, so the
    // response can't be used to discover which emails are registered.
    if (profile) {
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const codeHash = await bcrypt.hash(code, 12);
      const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60_000);

      await db.insert(passwordResetCodesTable).values({
        id: randomUUID(),
        user_id: profile.id,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      await sendPasswordResetEmail(profile.email!, code);

      void logAuditEvent({
        actorId: profile.id,
        actorRole: 'parent',
        action: 'password_reset_requested',
        ip: req.ip,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email?.trim() || !code?.trim() || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'email, code, and newPassword (min 6 chars) required' });
      return;
    }

    const invalidCodeError = () => res.status(400).json({ error: 'Invalid or expired code' });

    const normalizedEmail = email.trim().toLowerCase();
    const [profile] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.email, normalizedEmail))
      .limit(1);

    if (!profile) {
      invalidCodeError();
      return;
    }

    const candidates = await db
      .select()
      .from(passwordResetCodesTable)
      .where(
        and(
          eq(passwordResetCodesTable.user_id, profile.id),
          isNull(passwordResetCodesTable.used_at),
          gt(passwordResetCodesTable.expires_at, new Date()),
        ),
      )
      .orderBy(desc(passwordResetCodesTable.created_at));

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

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(profilesTable)
      .set({ password_hash: passwordHash, updated_at: new Date() })
      .where(eq(profilesTable.id, profile.id));

    await db
      .update(passwordResetCodesTable)
      .set({ used_at: new Date() })
      .where(eq(passwordResetCodesTable.id, matched.id));

    // Force re-login everywhere after a password reset.
    await db.delete(sessionsTable).where(eq(sessionsTable.user_id, profile.id));

    void logAuditEvent({
      actorId: profile.id,
      actorRole: 'parent',
      action: 'password_reset_completed',
      ip: req.ip,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email
router.post('/auth/verify-email', requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) {
      res.status(400).json({ error: 'code required' });
      return;
    }

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (profile.email_verified) {
      res.json({ ok: true, user: safeUser(profile) });
      return;
    }

    const candidates = await db
      .select()
      .from(emailVerificationCodesTable)
      .where(
        and(
          eq(emailVerificationCodesTable.user_id, profile.id),
          isNull(emailVerificationCodesTable.used_at),
          gt(emailVerificationCodesTable.expires_at, new Date()),
        ),
      )
      .orderBy(desc(emailVerificationCodesTable.created_at));

    let matched: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(code, candidate.code_hash)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      res.status(400).json({ error: 'Invalid or expired code' });
      return;
    }

    const [updated] = await db
      .update(profilesTable)
      .set({ email_verified: true, updated_at: new Date() })
      .where(eq(profilesTable.id, profile.id))
      .returning();

    await db
      .update(emailVerificationCodesTable)
      .set({ used_at: new Date() })
      .where(eq(emailVerificationCodesTable.id, matched.id));

    void logAuditEvent({
      actorId: profile.id,
      actorRole: req.actorRole!,
      familyId: req.familyId,
      action: 'email_verification_completed',
      ip: req.ip,
    });

    res.json({ ok: true, user: safeUser(updated) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification
router.post(
  '/auth/resend-verification',
  requireAuth as any,
  verificationResendLimiter,
  async (req: AuthRequest, res, next) => {
    try {
      const [profile] = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.id, req.userId!))
        .limit(1);

      if (!profile) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (profile.email_verified) {
        res.json({ ok: true });
        return;
      }

      if (!profile.email) {
        res.status(400).json({ error: 'No email on file for this account' });
        return;
      }

      await issueEmailVerificationCode(profile.id, profile.email);

      void logAuditEvent({
        actorId: profile.id,
        actorRole: req.actorRole!,
        familyId: req.familyId,
        action: 'email_verification_requested',
        ip: req.ip,
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/logout
router.post('/auth/logout', requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const header = req.headers.authorization!;
    const token = header.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId: req.familyId,
      action: 'logout',
      ip: req.ip,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/auth/me', requireAuth as any, async (req: AuthRequest, res, next) => {
  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: safeUser(profile) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me
router.patch('/auth/me', requireAuth as any, async (req: AuthRequest, res, next) => {
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
router.patch('/auth/onboarding', requireAuth as any, async (req: AuthRequest, res, next) => {
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

export default router;
