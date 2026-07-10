import { describe, it, expect, afterAll, vi } from 'vitest';
import {
  api,
  Cleanup,
  createParentWithFamily,
  addChildAndLogin,
  uniqueEmail,
} from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('auth flows', () => {
  it('registers a new parent and returns a usable token', async () => {
    const email = uniqueEmail('reg');
    const res = await api
      .post('/api/auth/register')
      .send({ name: 'Reg Test', email, password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email, role: 'parent', hasCompletedOnboarding: false });
    cleanup.trackUser(res.body.user.id);

    const me = await api.get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it('rejects registration with a duplicate email (409)', async () => {
    const email = uniqueEmail('dupe');
    const first = await api
      .post('/api/auth/register')
      .send({ name: 'First', email, password: 'password123' });
    cleanup.trackUser(first.body.user.id);

    const second = await api
      .post('/api/auth/register')
      .send({ name: 'Second', email, password: 'password123' });
    expect(second.status).toBe(409);
  });

  it('rejects registration with a short password or malformed email (400)', async () => {
    const shortPw = await api
      .post('/api/auth/register')
      .send({ name: 'X', email: uniqueEmail('short'), password: '123' });
    expect(shortPw.status).toBe(400);

    const badEmail = await api
      .post('/api/auth/register')
      .send({ name: 'X', email: 'not-an-email', password: 'password123' });
    expect(badEmail.status).toBe(400);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const email = uniqueEmail('login');
    const password = 'password123';
    const reg = await api.post('/api/auth/register').send({ name: 'Login Test', email, password });
    cleanup.trackUser(reg.body.user.id);

    const good = await api.post('/api/auth/login').send({ email, password });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeTruthy();

    const badPassword = await api.post('/api/auth/login').send({ email, password: 'wrongpass' });
    expect(badPassword.status).toBe(401);

    const unknownEmail = await api
      .post('/api/auth/login')
      .send({ email: uniqueEmail('nobody'), password });
    expect(unknownEmail.status).toBe(401);
  });

  it('looks up a family by join code and logs a child in with the right PIN', async () => {
    const parent = await createParentWithFamily(cleanup, 'child-flow');
    const child = await addChildAndLogin(cleanup, parent, 'child-flow-kid');

    const byCode = await api.get(`/api/auth/family-by-code/${parent.familyCode}`);
    expect(byCode.status).toBe(200);
    expect(byCode.body.children.map((c: { id: string }) => c.id)).toContain(child.childId);

    const wrongPin = await api
      .post('/api/auth/child-login')
      .send({ childId: child.childId, pin: '000000' });
    expect(wrongPin.status).toBe(401);

    const rightPin = await api
      .post('/api/auth/child-login')
      .send({ childId: child.childId, pin: child.pin });
    expect(rightPin.status).toBe(200);
    expect(rightPin.body.user.role).toBe('child');
  });

  it('rejects family-by-code lookup for an unknown code (404)', async () => {
    const res = await api.get('/api/auth/family-by-code/NOPE99');
    expect(res.status).toBe(404);
  });

  it('completes the forgot-password / reset-password round trip', async () => {
    const email = uniqueEmail('reset');
    const reg = await api
      .post('/api/auth/register')
      .send({ name: 'Reset Test', email, password: 'oldpassword' });
    cleanup.trackUser(reg.body.user.id);

    // SMTP isn't configured in this test environment, so sendPasswordResetEmail
    // (src/lib/email.ts) falls back to logging the plaintext code instead of
    // emailing it — the only place the code is ever available outside its
    // bcrypt hash, so this is how a test recovers it.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const forgot = await api.post('/api/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);

    const logged = logSpy.mock.calls.map((args) => args.join(' ')).join('\n');
    logSpy.mockRestore();
    const match = logged.match(/reset code for .*: (\d{6})/);
    expect(match).toBeTruthy();
    const code = match![1];

    const badReset = await api
      .post('/api/auth/reset-password')
      .send({ email, code: '999999', newPassword: 'newpassword123' });
    expect(badReset.status).toBe(400);

    const goodReset = await api
      .post('/api/auth/reset-password')
      .send({ email, code, newPassword: 'newpassword123' });
    expect(goodReset.status).toBe(200);

    const oldLogin = await api.post('/api/auth/login').send({ email, password: 'oldpassword' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await api.post('/api/auth/login').send({ email, password: 'newpassword123' });
    expect(newLogin.status).toBe(200);
  });
});
