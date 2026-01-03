/**
 * Vitestのユニットテスト設定を定義する。
 * @file
 */
const { defineConfig } = require("vitest/config");

const config = defineConfig({
  test: {
    include: ["tests/unit/**/*.test.js"],
  },
});

module.exports = config;
