import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Run test files serially (not in parallel worker pools) since they all
    // share one real Postgres database and their own cleanup bookkeeping is
    // per-file; this avoids cross-file interference without needing a
    // separate test database.
    fileParallelism: false,
  },
});
