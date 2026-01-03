/**
 * CypressのE2E設定を定義する。
 * @file
 */
module.exports = {
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: false,
    video: false,
    screenshotOnRunFailure: false,
  },
};
