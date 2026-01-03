/**
 * 動的検証レポートを生成する。
 * @file 動的検証レポートを生成する。
 */
const fs = require("fs");
const path = require("path");

const { renderReport } = require("./render");

const ROOT_DIR = path.join(__dirname, "..", "..");
const REPORT_DIR = path.join(ROOT_DIR, "reports");
const OUTPUT_PATH = path.join(REPORT_DIR, "test-report.html");
const VITEST_JSON_PATH = path.join(REPORT_DIR, "vitest-report.json");
const PLAYWRIGHT_JSON_PATH = path.join(REPORT_DIR, "playwright-report.json");
const CYPRESS_JSON_PATH = path.join(REPORT_DIR, "cypress", "index.json");

const PLAYWRIGHT_HTML_LINK = "playwright/index.html";
const CYPRESS_HTML_LINK = "cypress/index.html";

/**
 * @typedef {Object} ToolSummary
 * @property {string} name ツール名。
 * @property {string} status 状態(pass/fail/missing)。
 * @property {number} passed 成功数。
 * @property {number} failed 失敗数。
 * @property {number} skipped スキップ数。
 * @property {number} total 総数。
 * @property {number | null} durationMs 所要時間(ミリ秒)。
 * @property {string | null} reportLink HTMLレポートへのリンク。
 */

/**
 * ファイルパスからJSONを読み取る。
 * @param {string} filePath ファイルパス。
 * @returns {any | null} 解析結果またはnull。
 */
function readJson(filePath) {
  let result = null;
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      result = JSON.parse(content);
    } catch (error) {
      result = null;
    }
  }
  return result;
}

/**
 * 値を数値に正規化する。
 * @param {unknown} value 入力値。
 * @returns {number} 正規化後の数値。
 */
function toNumber(value) {
  let result = 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    result = value;
  }
  return result;
}

/**
 * Vitestの集計を作成する。
 * @param {any | null} data VitestのJSONデータ。
 * @returns {ToolSummary} 集計結果。
 */
function summarizeVitest(data) {
  /** @type {ToolSummary} */
  let summary = {
    name: "Vitest",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    durationMs: null,
    reportLink: null,
  };
  if (data) {
    const passed = toNumber(data.numPassedTests);
    const failed = toNumber(data.numFailedTests);
    const skipped = toNumber(data.numPendingTests) + toNumber(data.numTodoTests);
    const total = toNumber(data.numTotalTests);
    const status = failed > 0 || data.success === false ? "fail" : "pass";
    const startTime = typeof data.startTime === "number" ? data.startTime : null;
    let durationMs = null;
    if (Array.isArray(data.testResults) && data.testResults.length > 0) {
      const endTimes = data.testResults.map(
        (/** @type {{ endTime?: number }} */ result) =>
          toNumber(result.endTime)
      );
      const maxEnd = Math.max(...endTimes);
      if (startTime !== null && Number.isFinite(maxEnd)) {
        durationMs = Math.max(0, maxEnd - startTime);
      }
    }
    summary = {
      name: "Vitest",
      status,
      passed,
      failed,
      skipped,
      total,
      durationMs,
      reportLink: null,
    };
  }
  return summary;
}

/**
 * Playwrightの集計を作成する。
 * @param {any | null} data PlaywrightのJSONデータ。
 * @returns {ToolSummary} 集計結果。
 */
function summarizePlaywright(data) {
  /** @type {ToolSummary} */
  let summary = {
    name: "Playwright",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    durationMs: null,
    reportLink: PLAYWRIGHT_HTML_LINK,
  };
  if (data && data.stats) {
    const passed = toNumber(data.stats.expected);
    const failed = toNumber(data.stats.unexpected);
    const skipped = toNumber(data.stats.skipped) + toNumber(data.stats.flaky);
    const total = passed + failed + skipped;
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    const durationMs = toNumber(data.stats.duration);
    summary = {
      name: "Playwright",
      status,
      passed,
      failed,
      skipped,
      total,
      durationMs,
      reportLink: PLAYWRIGHT_HTML_LINK,
    };
  }
  return summary;
}

/**
 * Cypressの集計を作成する。
 * @param {any | null} data CypressのJSONデータ。
 * @returns {ToolSummary} 集計結果。
 */
function summarizeCypress(data) {
  const stats = data && data.stats ? data.stats : null;
  /** @type {ToolSummary} */
  let summary = {
    name: "Cypress",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    durationMs: null,
    reportLink: CYPRESS_HTML_LINK,
  };
  if (stats) {
    const passed = toNumber(stats.passes);
    const failed = toNumber(stats.failures);
    const skipped = toNumber(stats.pending);
    const total = toNumber(stats.tests);
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    const durationMs = toNumber(stats.duration);
    summary = {
      name: "Cypress",
      status,
      passed,
      failed,
      skipped,
      total,
      durationMs,
      reportLink: CYPRESS_HTML_LINK,
    };
  }
  return summary;
}

/**
 * レポートを生成する。
 */
function main() {
  const vitestData = readJson(VITEST_JSON_PATH);
  const playwrightData = readJson(PLAYWRIGHT_JSON_PATH);
  const cypressData = readJson(CYPRESS_JSON_PATH);

  const tools = [
    summarizeVitest(vitestData),
    summarizePlaywright(playwrightData),
    summarizeCypress(cypressData),
  ];

  const reportHtml = renderReport(tools, new Date().toISOString(), {
    playwright: PLAYWRIGHT_HTML_LINK,
    cypress: CYPRESS_HTML_LINK,
  });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, reportHtml, "utf8");
  const relativePath = path.relative(ROOT_DIR, OUTPUT_PATH);
  process.stdout.write(`Test report written to ${relativePath}\n`);
}

module.exports = {
  main,
};
