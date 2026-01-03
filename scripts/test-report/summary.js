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
  // 結果の初期値を定義する。
  let result = null;
  if (fs.existsSync(filePath)) {
    try {
      // ファイル内容を読み取る。
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
  // 結果の初期値を定義する。
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
    // passedを整形する。
    const passed = toNumber(data.numPassedTests);
    // failedを整形する。
    const failed = toNumber(data.numFailedTests);
    // skippedを用意する。
    const skipped = toNumber(data.numPendingTests) + toNumber(data.numTodoTests);
    // 件数を整形する。
    const total = toNumber(data.numTotalTests);
    // 状態を条件で選ぶ。
    const status = failed > 0 || data.success === false ? "fail" : "pass";
    // startTimeを条件で選ぶ。
    const startTime = typeof data.startTime === "number" ? data.startTime : null;
    // durationMsの初期値を定義する。
    let durationMs = null;
    if (Array.isArray(data.testResults) && data.testResults.length > 0) {
      // endTimesを取得する。
      const endTimes = data.testResults.map(
        (/** @type {{ endTime?: number }} */ result) =>
          toNumber(result.endTime)
      );
      // maxEndを取得する。
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
    // passedを整形する。
    const passed = toNumber(data.stats.expected);
    // failedを整形する。
    const failed = toNumber(data.stats.unexpected);
    // skippedを用意する。
    const skipped = toNumber(data.stats.skipped) + toNumber(data.stats.flaky);
    // 件数を用意する。
    const total = passed + failed + skipped;
    // 状態を条件で選ぶ。
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    // durationMsを整形する。
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
  // statsを条件で選ぶ。
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
    // passedを整形する。
    const passed = toNumber(stats.passes);
    // failedを整形する。
    const failed = toNumber(stats.failures);
    // skippedを整形する。
    const skipped = toNumber(stats.pending);
    // 件数を整形する。
    const total = toNumber(stats.tests);
    // 状態を条件で選ぶ。
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    // durationMsを整形する。
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
