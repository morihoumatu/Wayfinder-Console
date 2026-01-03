/**
 * Vitestのユニットテスト設定を定義する。
 * @file
 */
const { defineConfig } = require("vitest/config");

const config = defineConfig({
  test: {
    include: ["tests/unit/**/*.test.js"],
    environment: "node",
    globals: true,
    testTimeout: 5_000,
    hookTimeout: 5_000,
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      enabled: true,
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "reports/vitest-coverage",
      include: ["server/**/*.js"],
      exclude: ["server/index.js"],
    },
  },
});

module.exports = config;
