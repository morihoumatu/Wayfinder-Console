/**
 * PlaywrightのE2E設定を定義する。
 * @file
 */
const { defineConfig } = require("@playwright/test");

const isCI = Boolean(process.env["CI"]);

const config = defineConfig({
  testDir: "./tests/playwright",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI
    ? [
        ["dot"],
        ["html", { outputFolder: "reports/playwright", open: "never" }],
        ["json", { outputFile: "reports/playwright-report.json" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "reports/playwright", open: "never" }],
        ["json", { outputFile: "reports/playwright-report.json" }],
      ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node server.js",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});

module.exports = config;
