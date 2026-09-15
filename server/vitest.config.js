const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/tests/**/*.test.js'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Integration tests share one Postgres database and must not run
    // concurrently against each other (they truncate tables between tests).
    fileParallelism: false,
  },
});
