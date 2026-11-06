import { describe, it, expect, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, profilesTable, familiesTable } from '@workspace/db';
import { api, Cleanup, createParentWithFamily, addChildAndLogin } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('DELETE /api/auth/account', () => {
  it('requires auth and a password; rejects a wrong password', async () => {
    const parent = await createParentWithFamily(cleanup, 'del-guard');

    expect((await api.delete('/api/auth/account').send({ password: 'password123' })).status).toBe(401);

    const noPw = await api.delete('/api/auth/account').set('Authorization', `Bearer ${parent.token}`).send({});
    expect(noPw.status).toBe(400);

    const bad = await api
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ password: 'wrong-password' });
    expect(bad.status).toBe(401);

    const me = await api.get('/api/auth/me').set('Authorization', `Bearer ${parent.token}`);
    expect(me.status).toBe(200);
  });

  it('forbids child sessions', async () => {
    const parent = await createParentWithFamily(cleanup, 'del-child-parent');
    const child = await addChildAndLogin(cleanup, parent);
    const res = await api
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ password: child.pin });
    expect(res.status).toBe(403);
  });

  it('deletes the parent, family, children and invalidates sessions', async () => {
    const parent = await createParentWithFamily(cleanup, 'del-ok');
    const child = await addChildAndLogin(cleanup, parent);

    const res = await api
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ password: 'password123' });
    expect(res.status).toBe(200);

    const [p] = await db.select().from(profilesTable).where(eq(profilesTable.id, parent.userId));
    const [c] = await db.select().from(profilesTable).where(eq(profilesTable.id, child.childId));
    const [f] = await db.select().from(familiesTable).where(eq(familiesTable.id, parent.familyId));
    expect(p).toBeUndefined();
    expect(c).toBeUndefined();
    expect(f).toBeUndefined();

    expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${parent.token}`)).status).toBe(401);
    expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${child.token}`)).status).toBe(401);
  });
});
