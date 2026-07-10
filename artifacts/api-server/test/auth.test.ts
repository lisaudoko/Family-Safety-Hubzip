import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { db, sessionsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { api, Cleanup, registerParent } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('session expiry enforcement', () => {
  it('rejects a session whose expires_at is in the past', async () => {
    const { userId, token } = await registerParent(cleanup, 'auth-expired');

    // Backdate the session created by registration so it's already expired.
    await db
      .update(sessionsTable)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(sessionsTable.token, token));

    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);

    // The expired session row should be cleaned up, not just rejected.
    const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
    expect(rows.length).toBe(0);
  });

  it('accepts a session whose expires_at is in the future', async () => {
    const { token } = await registerParent(cleanup, 'auth-valid');
    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('rejects requests with a token that never existed', async () => {
    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${randomUUID()}`);
    expect(res.status).toBe(401);
  });
});
