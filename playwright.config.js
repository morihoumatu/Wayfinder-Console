/**
 * PlaywrightのE2E設定を定義する。
 * @file
 */
const { defineConfig } = require("@playwright/test");

const config = defineConfig({
  testDir: "./tests/playwright",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "node server.js",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

module.exports = config;
