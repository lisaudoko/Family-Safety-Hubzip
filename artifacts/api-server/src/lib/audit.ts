import { randomUUID } from 'crypto';
import { db } from '@workspace/db';
import { auditLogTable } from '@workspace/db';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth-middleware.js';
import { logger } from './logger.js';

export type AuditAction =
  | 'register'
  | 'login'
  | 'login_failed'
  | 'child_login'
  | 'child_login_failed'
  | 'logout'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'family_created'
  | 'child_added'
  | 'child_updated'
  | 'child_removed'
  | 'agreement_updated'
  | 'billing_checkout_started'
  | 'billing_portal_opened'
  | 'support_code_created'
  | 'support_session_started'
  | 'support_session_ended'
  | 'support_session_write';

export interface AuditEventInput {
  // Omit for events with no matching account (e.g. a failed login attempt
  // against an email that isn't registered).
  actorId?: string | null;
  actorRole: string;
  familyId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  isSupportSession?: boolean;
}

// Audit logging is best-effort: a logging failure must never break the
// underlying request, so failures are caught and logged instead of thrown.
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      id: randomUUID(),
      actor_id: input.actorId ?? null,
      actor_role: input.actorRole,
      family_id: input.familyId ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
      ip: input.ip ?? null,
      is_support_session: input.isSupportSession ?? false,
    });
  } catch (err) {
    logger.error({ err, action: input.action }, 'failed to write audit log entry');
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Mounted globally, ahead of the per-router requireAuth calls that actually
// set req.isSupportSession - so the check below happens inside the 'finish'
// handler (evaluated after the whole request completes, by which point
// requireAuth has already run and mutated this same req object), not at
// middleware-entry time. Logs one row per successful mutating request made
// through a support session, so every admin write is captured without
// instrumenting each route individually. GET reads during a support session
// are not logged in this pass.
export function logSupportSessionWrite(req: AuthRequest, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (
      req.isSupportSession &&
      MUTATING_METHODS.has(req.method) &&
      res.statusCode >= 200 &&
      res.statusCode < 300
    ) {
      void logAuditEvent({
        actorId: req.userId!,
        actorRole: req.actorRole ?? 'admin',
        familyId: req.familyId,
        action: 'support_session_write',
        targetType: 'request',
        targetId: req.originalUrl,
        metadata: { method: req.method, path: req.path },
        ip: req.ip,
        isSupportSession: true,
      });
    }
  });

  next();
}
