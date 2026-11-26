import { pool } from '@workspace/db';
import { runStartupMigrations } from '../src/lib/startup-migrate.js';

// Tests import the app directly and never run src/index.ts, so the server's
// startup migrations would otherwise only be applied by restarting the API
// server. Apply them (idempotent) once before the suite so new columns and
// tables never break the tests.
export default async function setup(): Promise<() => Promise<void>> {
  await runStartupMigrations();
  return async () => {
    await pool.end();
  };
}
