import type { Request, Response, NextFunction } from 'express';
import { db } from '@workspace/db';
import { sessionsTable, profilesTable, supportSessionsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  userId?: string;
  // Effective role for authorization checks (requireParent/requireAdmin). For
  // a support session this is forced to 'parent' so existing family routes
  // work unmodified - see actorRole below for the real role of the caller.
  role?: string;
  familyId?: string | null;
  // The caller's actual profile role, regardless of any support-session
  // override. Use this (not `role`) when writing audit log entries.
  actorRole?: string;
  isSupportSession?: boolean;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const rows = await db
      .select({
        userId: sessionsTable.user_id,
        role: profilesTable.role,
        familyId: profilesTable.family_id,
        expiresAt: sessionsTable.expires_at,
        supportSessionId: sessionsTable.support_session_id,
      })
      .from(sessionsTable)
      .innerJoin(profilesTable, eq(profilesTable.id, sessionsTable.user_id))
      .where(eq(sessionsTable.token, token))
      .limit(1);

    const session = rows[0];
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      try {
        // Best-effort cleanup; the 401 below is what actually matters.
        await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
      } catch {
        // ignore — an expired session still gets rejected either way
      }
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    req.userId = session.userId;
    req.actorRole = session.role;

    if (session.supportSessionId) {
      const [supportSession] = await db
        .select()
        .from(supportSessionsTable)
        .where(eq(supportSessionsTable.id, session.supportSessionId))
        .limit(1);

      if (
        !supportSession ||
        supportSession.ended_at !== null ||
        supportSession.expires_at.getTime() <= Date.now()
      ) {
        res.status(401).json({ error: 'Invalid or expired support session' });
        return;
      }

      // Authorize this request as if it were the target family's parent, but
      // keep req.userId pointed at the admin's own profile id so every
      // downstream write (and the audit log) still attributes actions to them.
      req.role = 'parent';
      req.familyId = supportSession.family_id;
      req.isSupportSession = true;
    } else {
      req.role = session.role;
      req.familyId = session.familyId;
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireParent(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.role !== 'parent') {
    res.status(403).json({ error: 'Parent account required' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.actorRole !== 'admin') {
    res.status(403).json({ error: 'Admin account required' });
    return;
  }
  next();
}
