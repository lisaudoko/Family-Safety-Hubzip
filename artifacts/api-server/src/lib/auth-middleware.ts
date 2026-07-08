import type { Request, Response, NextFunction } from 'express';
import { db } from '@workspace/db';
import { sessionsTable, profilesTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
  familyId?: string | null;
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

    req.userId = session.userId;
    req.role = session.role;
    req.familyId = session.familyId;
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
