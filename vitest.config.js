/**
 * Vitestのユニットテスト設定を定義する。
 * @file
 */
const { defineConfig } = require("vitest/config");

const config = defineConfig({
  test: {
    include: ["tests/unit/**/*.test.js"],
    environment: "node",
    testTimeout: 5_000,
    hookTimeout: 5_000,
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: false,
  },
});

module.exports = config;
