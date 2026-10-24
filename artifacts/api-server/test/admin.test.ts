import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { db, sessionsTable, supportSessionsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import {
  api,
  Cleanup,
  createParentWithFamily,
  addChildAndLogin,
  createAdmin,
} from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('device DELETE RBAC fix', () => {
  it("a child gets 403 deleting a device in their own family", async () => {
    const parent = await createParentWithFamily(cleanup, 'adm-rbac');
    const child = await addChildAndLogin(cleanup, parent, 'adm-rbac-kid');
    const deviceRes = await api
      .post('/api/devices')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ id: randomUUID(), name: 'Kid phone', platform: 'ios', capabilities: [] });
    expect(deviceRes.status).toBe(201);

    const res = await api
      .delete(`/api/devices/${deviceRes.body.device.id}`)
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});

describe('admin support-session lifecycle', () => {
  it('mints a code, redeems it, acts on the family, and every write is audit-logged to the admin', async () => {
    const parent = await createParentWithFamily(cleanup, 'adm-flow');
    const admin = await createAdmin(cleanup, 'adm-flow-support');

    const codeRes = await api
      .post('/api/family/support-code')
      .set('Authorization', `Bearer ${parent.token}`);
    expect(codeRes.status).toBe(201);
    const { code } = codeRes.body;
    expect(typeof code).toBe('string');

    const redeemRes = await api
      .post('/api/admin/support-sessions')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ code });
    expect(redeemRes.status).toBe(201);
    expect(redeemRes.body.familyId).toBe(parent.familyId);
    const supportToken = redeemRes.body.token as string;
    const sessionId = redeemRes.body.sessionId as string;

    // The support token can read the target family...
    const familyRes = await api
      .get('/api/family')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(familyRes.status).toBe(200);
    expect(familyRes.body.family.id).toBe(parent.familyId);

    // ...and write to it (add a child), same as a parent could.
    const childId = randomUUID();
    cleanup.trackUser(childId);
    const addChildRes = await api
      .post('/api/family/children')
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ id: childId, familyId: parent.familyId, name: 'Support-added kid', ageBand: '10-13' });
    expect(addChildRes.status).toBe(200);

    // The code is single-use.
    const reuseRes = await api
      .post('/api/admin/support-sessions')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ code });
    expect(reuseRes.status).toBe(400);

    // End the session explicitly.
    const endRes = await api
      .post(`/api/admin/support-sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(endRes.status).toBe(200);

    // The support token stops working after the session ends.
    const afterEndRes = await api
      .get('/api/family')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(afterEndRes.status).toBe(401);

    // Audit trail: the parent can see the support session and the write,
    // both attributed to the admin's own id, not the parent's.
    const auditRes = await api
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${parent.token}`);
    expect(auditRes.status).toBe(200);
    const actions = auditRes.body.events.map((e: any) => e.action);
    expect(actions).toContain('support_session_started');
    expect(actions).toContain('support_session_ended');
    expect(actions).toContain('support_session_write');

    const supportWriteEvent = auditRes.body.events.find((e: any) => e.action === 'support_session_write');
    expect(supportWriteEvent.actorId).toBe(admin.userId);
    expect(supportWriteEvent.isSupportSession).toBe(true);

    const childAddedEvent = auditRes.body.events.find(
      (e: any) => e.action === 'child_added' && e.targetId === childId,
    );
    expect(childAddedEvent.actorId).toBe(admin.userId);
    expect(childAddedEvent.isSupportSession).toBe(true);
  });

  it('rejects an expired support session', async () => {
    const parent = await createParentWithFamily(cleanup, 'adm-expire');
    const admin = await createAdmin(cleanup, 'adm-expire-support');

    const codeRes = await api
      .post('/api/family/support-code')
      .set('Authorization', `Bearer ${parent.token}`);
    const redeemRes = await api
      .post('/api/admin/support-sessions')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ code: codeRes.body.code });

    const supportToken = redeemRes.body.token as string;
    const sessionId = redeemRes.body.sessionId as string;

    // Backdate the support session so it's already expired.
    await db
      .update(supportSessionsTable)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(supportSessionsTable.id, sessionId));

    const res = await api.get('/api/family').set('Authorization', `Bearer ${supportToken}`);
    expect(res.status).toBe(401);
  });

  it('a non-admin gets 403 trying to redeem a support code', async () => {
    const parent = await createParentWithFamily(cleanup, 'adm-nonadmin');
    const codeRes = await api
      .post('/api/family/support-code')
      .set('Authorization', `Bearer ${parent.token}`);

    const res = await api
      .post('/api/admin/support-sessions')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ code: codeRes.body.code });
    expect(res.status).toBe(403);
  });

  it('a child gets 403 minting a support code', async () => {
    const parent = await createParentWithFamily(cleanup, 'adm-childcode');
    const child = await addChildAndLogin(cleanup, parent, 'adm-childcode-kid');

    const res = await api
      .post('/api/family/support-code')
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});

describe('audit log family scoping', () => {
  it("family A's parent never sees family B's audit events", async () => {
    const parentA = await createParentWithFamily(cleanup, 'adm-auditA');
    const parentB = await createParentWithFamily(cleanup, 'adm-auditB');

    await api.post('/api/family/support-code').set('Authorization', `Bearer ${parentB.token}`);

    const res = await api.get('/api/audit-log').set('Authorization', `Bearer ${parentA.token}`);
    expect(res.status).toBe(200);
    const actions = res.body.events.map((e: any) => e.action);
    expect(actions).not.toContain('support_code_created');
  });

  it('a child gets 403 reading the audit log', async () => {
    const parent = await createParentWithFamily(cleanup, 'adm-auditchild');
    const child = await addChildAndLogin(cleanup, parent, 'adm-auditchild-kid');

    const res = await api.get('/api/audit-log').set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});
