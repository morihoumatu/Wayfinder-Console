/**
 * CypressのE2E設定を定義する。
 * @file
 */
const isCI = Boolean(process.env["CI"]);

module.exports = {
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: false,
    defaultCommandTimeout: 8_000,
    pageLoadTimeout: 60_000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    video: isCI,
    screenshotOnRunFailure: true,
  },
};
