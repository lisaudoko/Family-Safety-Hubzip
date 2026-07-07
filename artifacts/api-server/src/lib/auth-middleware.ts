import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sessionsTable, profilesTable } from "@workspace/db";
import { eq, gt } from "drizzle-orm";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  try {
    const rows = await db
      .select({ userId: sessionsTable.user_id })
      .from(sessionsTable)
      .where(
        eq(sessionsTable.token, token),
      )
      .limit(1);

    const session = rows[0];
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    req.userId = session.userId;
    next();
  } catch (err) {
    next(err);
  }
}
