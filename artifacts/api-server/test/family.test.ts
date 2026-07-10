import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { api, Cleanup, createParentWithFamily, addChildAndLogin } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('family: child view', () => {
  it("a child sees their parent(s) in GET /family, and the sibling list excludes themselves", async () => {
    const parent = await createParentWithFamily(cleanup, 'fam-p1');
    const child = await addChildAndLogin(cleanup, parent, 'fam-c1');

    const res = await api
      .get('/api/family')
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(200);
    expect(res.body.family.parents.map((p: any) => p.id)).toContain(parent.userId);

    const siblingIds = res.body.family.siblings.map((c: any) => c.id);
    expect(siblingIds).not.toContain(child.childId);
  });

  it("a parent still sees the full children list (siblings unfiltered) in GET /family", async () => {
    const parent = await createParentWithFamily(cleanup, 'fam-p2');
    const child = await addChildAndLogin(cleanup, parent, 'fam-c2');

    const res = await api
      .get('/api/family')
      .set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    const childIds = res.body.family.children.map((c: any) => c.id);
    const siblingIds = res.body.family.siblings.map((c: any) => c.id);
    expect(childIds).toContain(child.childId);
    expect(siblingIds).toContain(child.childId);
  });
});

describe('family: agreement access', () => {
  it("a child can read the family agreement (previously always null for children)", async () => {
    const parent = await createParentWithFamily(cleanup, 'fam-p3');
    const child = await addChildAndLogin(cleanup, parent, 'fam-c3');

    const agreementId = randomUUID();
    const putRes = await api
      .put('/api/family/agreement')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: agreementId, familyId: parent.familyId, rules: [], customRules: [] });
    expect(putRes.status).toBe(200);

    const res = await api
      .get('/api/family/agreement')
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(200);
    expect(res.body.agreement.familyId).toBe(parent.familyId);
  });

  it("a child cannot write the family agreement", async () => {
    const parent = await createParentWithFamily(cleanup, 'fam-p4');
    const child = await addChildAndLogin(cleanup, parent, 'fam-c4');

    const res = await api
      .put('/api/family/agreement')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ id: randomUUID(), familyId: parent.familyId, rules: [], customRules: [] });
    expect(res.status).toBe(403);
  });

  it("a parent cannot write another family's agreement", async () => {
    const parentA = await createParentWithFamily(cleanup, 'fam-p5A');
    const parentB = await createParentWithFamily(cleanup, 'fam-p5B');

    const res = await api
      .put('/api/family/agreement')
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ id: randomUUID(), familyId: parentB.familyId, rules: [], customRules: [] });
    expect(res.status).toBe(403);
  });
});

describe('family: child CRUD ownership (IDOR fixes)', () => {
  it("a parent cannot add a child to another family", async () => {
    const parentA = await createParentWithFamily(cleanup, 'fam-p6A');
    const parentB = await createParentWithFamily(cleanup, 'fam-p6B');

    const res = await api
      .post('/api/family/children')
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ id: randomUUID(), familyId: parentB.familyId, name: 'Intruder Kid', ageBand: '10-13' });
    expect(res.status).toBe(403);
  });

  it("a parent cannot PATCH another family's child", async () => {
    const parentA = await createParentWithFamily(cleanup, 'fam-p7A');
    const parentB = await createParentWithFamily(cleanup, 'fam-p7B');
    const childB = await addChildAndLogin(cleanup, parentB, 'fam-p7B-kid');

    const res = await api
      .patch(`/api/family/children/${childB.childId}`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(404);
  });

  it("a parent cannot DELETE another family's child", async () => {
    const parentA = await createParentWithFamily(cleanup, 'fam-p8A');
    const parentB = await createParentWithFamily(cleanup, 'fam-p8B');
    const childB = await addChildAndLogin(cleanup, parentB, 'fam-p8B-kid');

    const res = await api
      .delete(`/api/family/children/${childB.childId}`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(res.status).toBe(404);

    // Confirm the child still exists and wasn't actually removed.
    const check = await api
      .get('/api/family')
      .set('Authorization', `Bearer ${parentB.token}`);
    const childIds = check.body.family.children.map((c: any) => c.id);
    expect(childIds).toContain(childB.childId);
  });
});
