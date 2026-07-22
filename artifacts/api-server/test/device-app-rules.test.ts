import { describe, it, expect, afterAll } from 'vitest';
import { api, Cleanup, createParentWithFamily, registerDevice } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('device app rules (General Apps)', () => {
  it('lists empty, creates, updates, and deletes an app rule', async () => {
    const parent = await createParentWithFamily(cleanup, 'dar-1');
    const { deviceId } = await registerDevice(parent.token, { capabilities: [] });

    const emptyRes = await api
      .get(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.rules).toEqual([]);

    const createRes = await api
      .post(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ appBundleId: 'com.google.ios.youtube', appName: 'YouTube' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.rule).toMatchObject({
      appBundleId: 'com.google.ios.youtube',
      appName: 'YouTube',
      blocked: false,
      restrictedStart: null,
      restrictedEnd: null,
    });
    const ruleId = createRes.body.rule.id;

    const patchRes = await api
      .patch(`/api/devices/${deviceId}/app-rules/${ruleId}`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ restrictedStart: '21:00', restrictedEnd: '07:00', dailyLimitMinutes: 60 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.rule).toMatchObject({
      restrictedStart: '21:00',
      restrictedEnd: '07:00',
      dailyLimitMinutes: 60,
    });

    const listRes = await api
      .get(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.rules).toHaveLength(1);

    const deleteRes = await api
      .delete(`/api/devices/${deviceId}/app-rules/${ruleId}`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(deleteRes.status).toBe(200);

    const listAfterDelete = await api
      .get(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(listAfterDelete.body.rules).toEqual([]);
  });

  it('upserts by app bundle id on repeated POST (idempotent create)', async () => {
    const parent = await createParentWithFamily(cleanup, 'dar-2');
    const { deviceId } = await registerDevice(parent.token, { capabilities: [] });

    const first = await api
      .post(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ appBundleId: 'com.tiktok', appName: 'TikTok' });
    expect(first.status).toBe(201);

    const second = await api
      .post(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ appBundleId: 'com.tiktok', appName: 'TikTok (renamed)', blocked: true });
    expect(second.status).toBe(201);
    expect(second.body.rule.id).toBe(first.body.rule.id);
    expect(second.body.rule.appName).toBe('TikTok (renamed)');
    expect(second.body.rule.blocked).toBe(true);

    const listRes = await api
      .get(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(listRes.body.rules).toHaveLength(1);
  });

  it('rejects malformed create/patch bodies (400)', async () => {
    const parent = await createParentWithFamily(cleanup, 'dar-3');
    const { deviceId } = await registerDevice(parent.token, { capabilities: [] });

    const missingFields = await api
      .post(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ appName: 'No Bundle Id' });
    expect(missingFields.status).toBe(400);

    const badTime = await api
      .post(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ appBundleId: 'com.example', appName: 'Example', restrictedStart: 'not-a-time' });
    expect(badTime.status).toBe(400);

    const createRes = await api
      .post(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ appBundleId: 'com.example2', appName: 'Example2' });
    const ruleId = createRes.body.rule.id;

    const badPatch = await api
      .patch(`/api/devices/${deviceId}/app-rules/${ruleId}`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ dailyLimitMinutes: -5 });
    expect(badPatch.status).toBe(400);
  });

  it("family A's parent gets 404 on family B's device app rules (create/list/patch/delete)", async () => {
    const parentA = await createParentWithFamily(cleanup, 'dar-A');
    const parentB = await createParentWithFamily(cleanup, 'dar-B');
    const { deviceId } = await registerDevice(parentB.token, { capabilities: [] });

    const createRes = await api
      .post(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ appBundleId: 'com.example', appName: 'Example' });
    expect(createRes.status).toBe(404);

    const listRes = await api
      .get(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(listRes.status).toBe(404);

    // create a real rule as the owning family, then confirm family A can't touch it
    const ownedRule = await api
      .post(`/api/devices/${deviceId}/app-rules`)
      .set('Authorization', `Bearer ${parentB.token}`)
      .send({ appBundleId: 'com.example', appName: 'Example' });
    expect(ownedRule.status).toBe(201);
    const ruleId = ownedRule.body.rule.id;

    const patchRes = await api
      .patch(`/api/devices/${deviceId}/app-rules/${ruleId}`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ blocked: true });
    expect(patchRes.status).toBe(404);

    const deleteRes = await api
      .delete(`/api/devices/${deviceId}/app-rules/${ruleId}`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(deleteRes.status).toBe(404);
  });
});
