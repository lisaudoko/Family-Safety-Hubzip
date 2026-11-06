import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { db, sessionsTable } from '@workspace/db';
import { hashToken } from '../src/lib/session-token.js';
import { eq } from 'drizzle-orm';
import { api, Cleanup, registerParent, createParentWithFamily, addChildAndLogin } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('session expiry enforcement', () => {
  it('rejects a session whose expires_at is in the past', async () => {
    const { userId, token } = await registerParent(cleanup, 'auth-expired');

    // Backdate the session created by registration so it's already expired.
    await db
      .update(sessionsTable)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(sessionsTable.token, hashToken(token)));

    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);

    // The expired session row should be cleaned up, not just rejected.
    const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.token, hashToken(token)));
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

describe('session token storage', () => {
  it('stores only a hash of the token, never the plaintext', async () => {
    const { userId, token } = await registerParent(cleanup, 'auth-hashed');
    const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.user_id, userId));
    expect(rows.length).toBe(1);
    expect(rows[0].token).not.toBe(token);
    expect(rows[0].token).toBe(hashToken(token));
    expect(rows[0].token).toHaveLength(64);
  });

  it('ends a child\'s open session when a parent changes their PIN', async () => {
    const parent = await createParentWithFamily(cleanup, 'auth-pin-parent');
    const child = await addChildAndLogin(cleanup, parent);
    expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${child.token}`)).status).toBe(200);

    const patch = await api
      .patch(`/api/family/children/${child.childId}`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ pin: '246802' });
    expect(patch.status).toBe(200);

    expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${child.token}`)).status).toBe(401);
    // The parent's own session is untouched.
    expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${parent.token}`)).status).toBe(200);
  });
});
