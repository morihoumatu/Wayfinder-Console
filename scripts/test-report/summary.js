/**
 * 動的検証レポートの集計をまとめる。
 * @file 動的検証レポートの集計をまとめる。
 */
const fs = require("fs");

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
 * @param {string | null} reportLink レポートリンク。
 * @returns {ToolSummary} 集計結果。
 */
function summarizePlaywright(data, reportLink) {
  /** @type {ToolSummary} */
  let summary = {
    name: "Playwright",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    durationMs: null,
    reportLink,
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
      reportLink,
    };
  }
  return summary;
}

/**
 * Cypressの集計を作成する。
 * @param {any | null} data CypressのJSONデータ。
 * @param {string | null} reportLink レポートリンク。
 * @returns {ToolSummary} 集計結果。
 */
function summarizeCypress(data, reportLink) {
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
    reportLink,
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
      reportLink,
    };
  }
  return summary;
}

module.exports = {
  readJson,
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
  toNumber,
};
