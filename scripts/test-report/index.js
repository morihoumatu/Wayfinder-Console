/**
 * 動的検証レポートを生成する。
 * @file 動的検証レポートを生成する。
 */
const fs = require("fs");
const path = require("path");

const { renderReport } = require("./render");
const {
  readJson,
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
} = require("./summary");
const {
  summarizeLighthouse,
  summarizeLoadTest,
  summarizeSecurity,
} = require("./summary-extra");

const ROOT_DIR = path.join(__dirname, "..", "..");
const REPORT_DIR = path.join(ROOT_DIR, "reports");
const OUTPUT_PATH = path.join(REPORT_DIR, "test-report.html");
const VITEST_JSON_PATH = path.join(REPORT_DIR, "vitest-report.json");
const PLAYWRIGHT_JSON_PATH = path.join(REPORT_DIR, "playwright-report.json");
const CYPRESS_JSON_PATH = path.join(REPORT_DIR, "cypress", "index.json");
const LIGHTHOUSE_JSON_PATH = path.join(REPORT_DIR, "lighthouse-report.json");
const LOAD_JSON_PATH = path.join(REPORT_DIR, "load-test-report.json");
const SECURITY_JSON_PATH = path.join(REPORT_DIR, "security-report.json");
const GATE_JSON_PATH = path.join(REPORT_DIR, "test-gate.json");

const PLAYWRIGHT_HTML_LINK = "playwright/index.html";
const CYPRESS_HTML_LINK = "cypress/index.html";
const LIGHTHOUSE_HTML_LINK = "lighthouse-report.html";
const LOAD_JSON_LINK = "load-test-report.json";
const SECURITY_JSON_LINK = "security-report.json";

/**
 * レポートを生成する。
 */
function main() {
  const vitestData = readJson(VITEST_JSON_PATH);
  const playwrightData = readJson(PLAYWRIGHT_JSON_PATH);
  const cypressData = readJson(CYPRESS_JSON_PATH);
  const lighthouseData = readJson(LIGHTHOUSE_JSON_PATH);
  const loadData = readJson(LOAD_JSON_PATH);
  const securityData = readJson(SECURITY_JSON_PATH);
  const gateData = readJson(GATE_JSON_PATH);

  const tools = [
    summarizeVitest(vitestData),
    summarizePlaywright(playwrightData, PLAYWRIGHT_HTML_LINK),
    summarizeCypress(cypressData, CYPRESS_HTML_LINK),
    summarizeLighthouse(lighthouseData, LIGHTHOUSE_HTML_LINK),
    summarizeLoadTest(loadData, LOAD_JSON_LINK),
    summarizeSecurity(securityData, SECURITY_JSON_LINK),
  ];

  const reportHtml = renderReport(
    tools,
    new Date().toISOString(),
    {
      playwright: PLAYWRIGHT_HTML_LINK,
      cypress: CYPRESS_HTML_LINK,
      lighthouse: LIGHTHOUSE_HTML_LINK,
      load: LOAD_JSON_LINK,
      security: SECURITY_JSON_LINK,
    },
    gateData
  );
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, reportHtml, "utf8");
  const relativePath = path.relative(ROOT_DIR, OUTPUT_PATH);
  process.stdout.write(`Test report written to ${relativePath}\n`);
}

module.exports = {
  main,
};
