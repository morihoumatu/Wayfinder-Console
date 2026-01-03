/**
 * 動的検証レポートを生成する。
 * @file 動的検証レポートを生成する。
 */
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");

// renderからrenderReportを取得する。
const { renderReport } = require("./render");
// summaryから必要な値を取得する。
const {
  readJson,
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
} = require("./summary");
// summary-extraからsummarizeLighthouseとsummarizeLoadTestとsummarizeSecurityを取得する。
const {
  summarizeLighthouse,
  summarizeLoadTest,
  summarizeSecurity,
} = require("./summary-extra");

// パスを組み立てる。
const ROOT_DIR = path.join(__dirname, "..", "..");
// パスを組み立てる。
const REPORT_DIR = path.join(ROOT_DIR, "reports");
// パスを組み立てる。
const OUTPUT_PATH = path.join(REPORT_DIR, "test-report.html");
// パスを組み立てる。
const VITEST_JSON_PATH = path.join(REPORT_DIR, "vitest-report.json");
// パスを組み立てる。
const PLAYWRIGHT_JSON_PATH = path.join(REPORT_DIR, "playwright-report.json");
// パスを組み立てる。
const CYPRESS_JSON_PATH = path.join(REPORT_DIR, "cypress", "index.json");
// パスを組み立てる。
const LIGHTHOUSE_JSON_PATH = path.join(REPORT_DIR, "lighthouse-report.json");
// パスを組み立てる。
const LOAD_JSON_PATH = path.join(REPORT_DIR, "load-test-report.json");
// パスを組み立てる。
const SECURITY_JSON_PATH = path.join(REPORT_DIR, "security-report.json");
// パスを組み立てる。
const GATE_JSON_PATH = path.join(REPORT_DIR, "test-gate.json");

// PLAYWRIGHT_HTML_LINKの定数を定義する。
const PLAYWRIGHT_HTML_LINK = "playwright/index.html";
// CYPRESS_HTML_LINKの定数を定義する。
const CYPRESS_HTML_LINK = "cypress/index.html";
// LIGHTHOUSE_HTML_LINKの定数を定義する。
const LIGHTHOUSE_HTML_LINK = "lighthouse-report.html";
// LOAD_JSON_LINKの定数を定義する。
const LOAD_JSON_LINK = "load-test-report.json";
// SECURITY_JSON_LINKの定数を定義する。
const SECURITY_JSON_LINK = "security-report.json";

/**
 * レポートを生成する。
 */
function main() {
  // データを読み込む。
  const vitestData = readJson(VITEST_JSON_PATH);
  // データを読み込む。
  const playwrightData = readJson(PLAYWRIGHT_JSON_PATH);
  // データを読み込む。
  const cypressData = readJson(CYPRESS_JSON_PATH);
  // データを読み込む。
  const lighthouseData = readJson(LIGHTHOUSE_JSON_PATH);
  // データを読み込む。
  const loadData = readJson(LOAD_JSON_PATH);
  // データを読み込む。
  const securityData = readJson(SECURITY_JSON_PATH);
  // データを読み込む。
  const gateData = readJson(GATE_JSON_PATH);

  // toolsの一覧を用意する。
  const tools = [
    summarizeVitest(vitestData),
    summarizePlaywright(playwrightData, PLAYWRIGHT_HTML_LINK),
    summarizeCypress(cypressData, CYPRESS_HTML_LINK),
    summarizeLighthouse(lighthouseData, LIGHTHOUSE_HTML_LINK),
    summarizeLoadTest(loadData, LOAD_JSON_LINK),
    summarizeSecurity(securityData, SECURITY_JSON_LINK),
  ];

  // reportHtmlを取得する。
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
  // パス情報を取得する。
  const relativePath = path.relative(ROOT_DIR, OUTPUT_PATH);
  process.stdout.write(`Test report written to ${relativePath}\n`);
}

module.exports = {
  main,
};
