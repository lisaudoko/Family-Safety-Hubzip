import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { db, familiesTable, profilesTable } from '@workspace/db';
import { inArray } from 'drizzle-orm';

export const api = request(app);

export interface ParentContext {
  userId: string;
  email: string;
  token: string;
  familyId: string;
  familyCode: string;
}

export interface ChildContext {
  childId: string;
  familyId: string;
  pin: string;
  token: string;
}

// Tracks every row created by tests in this run so afterAll/afterEach hooks
// can delete them and leave the shared dev database clean. Deleting a family
// row cascades to children/devices/device_events/family_agreements/
// subscriptions/coach_usage/family_reports (all declared with
// onDelete: 'cascade' against families.id in lib/db/src/schema/index.ts).
// Deleting a profile row cascades to sessions/password_reset_codes/
// email_verification_codes. profiles.family_id is a plain text column (no FK),
// so deleting families first and profiles second is always safe.
export class Cleanup {
  familyIds = new Set<string>();
  userIds = new Set<string>();

  trackFamily(id: string) {
    this.familyIds.add(id);
  }
  trackUser(id: string) {
    this.userIds.add(id);
  }

  async run(): Promise<void> {
    if (this.familyIds.size > 0) {
      await db.delete(familiesTable).where(inArray(familiesTable.id, [...this.familyIds]));
      this.familyIds.clear();
    }
    if (this.userIds.size > 0) {
      await db.delete(profilesTable).where(inArray(profilesTable.id, [...this.userIds]));
      this.userIds.clear();
    }
  }
}

export function uniqueEmail(label = 'user'): string {
  return `${label}-${randomUUID()}@example.test`;
}

/** Registers a brand-new parent account and returns its token/profile info. */
export async function registerParent(cleanup: Cleanup, label = 'parent'): Promise<{
  userId: string;
  email: string;
  token: string;
}> {
  const email = uniqueEmail(label);
  const res = await api
    .post('/api/auth/register')
    .send({ name: `Test ${label}`, email, password: 'password123' });
  if (res.status !== 201) {
    throw new Error(`registerParent failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const userId = res.body.user.id as string;
  cleanup.trackUser(userId);
  return { userId, email, token: res.body.token as string };
}

/** Registers a parent and creates a family for them (full ParentContext). */
export async function createParentWithFamily(cleanup: Cleanup, label = 'parent'): Promise<ParentContext> {
  const { userId, email, token } = await registerParent(cleanup, label);
  const familyId = randomUUID();
  cleanup.trackFamily(familyId);
  const res = await api
    .post('/api/family')
    .set('Authorization', `Bearer ${token}`)
    .send({ id: familyId, name: `${label} family` });
  if (res.status !== 200) {
    throw new Error(`createFamily failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { userId, email, token, familyId, familyCode: res.body.familyCode as string };
}

/** Adds a child to an existing family and logs the child in, returning both. */
export async function addChildAndLogin(
  cleanup: Cleanup,
  parent: ParentContext,
  label = 'child',
): Promise<ChildContext> {
  const childId = randomUUID();
  cleanup.trackUser(childId);
  const pin = '135790';
  const createRes = await api
    .post('/api/family/children')
    .set('Authorization', `Bearer ${parent.token}`)
    .send({ id: childId, familyId: parent.familyId, name: `Test ${label}`, ageBand: '10-13', pin });
  if (createRes.status !== 200) {
    throw new Error(`addChild failed: ${createRes.status} ${JSON.stringify(createRes.body)}`);
  }

  const loginRes = await api.post('/api/auth/child-login').send({ childId, pin });
  if (loginRes.status !== 200) {
    throw new Error(`childLogin failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  return { childId, familyId: parent.familyId, pin, token: loginRes.body.token as string };
}

/** Registers a device owned by the given token (parent or child), returns its id. */
export async function registerDevice(
  token: string,
  overrides: Partial<{
    id: string;
    name: string;
    platform: string;
    osVersion: string;
    appVersion: string;
    capabilities: string[];
  }> = {},
): Promise<{ status: number; body: any; deviceId: string }> {
  const deviceId = overrides.id ?? randomUUID();
  const res = await api
    .post('/api/devices')
    .set('Authorization', `Bearer ${token}`)
    .send({
      id: deviceId,
      name: overrides.name ?? 'Test Device',
      platform: overrides.platform ?? 'ios',
      osVersion: overrides.osVersion,
      appVersion: overrides.appVersion,
      capabilities: overrides.capabilities ?? [],
    });
  return { status: res.status, body: res.body, deviceId };
}

/**
 * Simulates a manually-seeded admin/support account (there's no
 * self-registration endpoint for the admin role) by inserting a profile
 * directly, then logging in through the normal /api/auth/login flow.
 */
export async function createAdmin(cleanup: Cleanup, label = 'admin'): Promise<{
  userId: string;
  email: string;
  password: string;
  token: string;
}> {
  const email = uniqueEmail(label);
  const password = 'adminPassword123';
  const userId = randomUUID();
  cleanup.trackUser(userId);

  await db.insert(profilesTable).values({
    id: userId,
    email,
    full_name: `Test ${label}`,
    password_hash: await bcrypt.hash(password, 12),
    role: 'admin',
    has_completed_onboarding: true,
  });

  const loginRes = await api.post('/api/auth/login').send({ email, password });
  if (loginRes.status !== 200) {
    throw new Error(`admin login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  return { userId, email, password, token: loginRes.body.token as string };
}

export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
