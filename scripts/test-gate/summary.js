/**
 * 品質ゲート向けの集計をまとめる。
 * @file 品質ゲート向けの集計をまとめる。
 */
const fs = require("fs");

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
 * @returns {any} 集計結果。
 */
function summarizeVitest(data) {
  let summary = {
    name: "Vitest",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  if (data) {
    const passed = toNumber(data.numPassedTests);
    const failed = toNumber(data.numFailedTests);
    const skipped = toNumber(data.numPendingTests) + toNumber(data.numTodoTests);
    const total = toNumber(data.numTotalTests);
    const status = failed > 0 || data.success === false ? "fail" : "pass";
    summary = {
      name: "Vitest",
      status,
      passed,
      failed,
      skipped,
      total,
    };
  }
  return summary;
}

/**
 * Playwrightの集計を作成する。
 * @param {any | null} data PlaywrightのJSONデータ。
 * @returns {any} 集計結果。
 */
function summarizePlaywright(data) {
  let summary = {
    name: "Playwright",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  if (data && data.stats) {
    const passed = toNumber(data.stats.expected);
    const failed = toNumber(data.stats.unexpected) + toNumber(data.stats.flaky);
    const skipped = toNumber(data.stats.skipped);
    const total = passed + failed + skipped;
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    summary = {
      name: "Playwright",
      status,
      passed,
      failed,
      skipped,
      total,
    };
  }
  return summary;
}

/**
 * Cypressの集計を作成する。
 * @param {any | null} data CypressのJSONデータ。
 * @returns {any} 集計結果。
 */
function summarizeCypress(data) {
  const stats = data && data.stats ? data.stats : null;
  let summary = {
    name: "Cypress",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  if (stats) {
    const passed = toNumber(stats.passes);
    const failed = toNumber(stats.failures);
    const skipped = toNumber(stats.pending);
    const total = toNumber(stats.tests);
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    summary = {
      name: "Cypress",
      status,
      passed,
      failed,
      skipped,
      total,
    };
  }
  return summary;
}

/**
 * 品質ゲートを評価する。
 * @param {any} summary 集計結果。
 * @param {any} rule ゲート条件。
 * @param {string} reportPath レポートパス。
 * @returns {{ ok: boolean, issues: string[] }} 評価結果。
 */
function evaluateGate(summary, rule, reportPath) {
  const issues = [];
  if (summary.status === "missing") {
    issues.push(`${summary.name}: レポートが見つかりません (${reportPath})`);
  }
  if (summary.failed > rule.maxFailed) {
    issues.push(
      `${summary.name}: 失敗数 ${summary.failed} が上限 ${rule.maxFailed} を超えています`
    );
  }
  if (summary.skipped > rule.maxSkipped) {
    issues.push(
      `${summary.name}: スキップ数 ${summary.skipped} が上限 ${rule.maxSkipped} を超えています`
    );
  }
  if (summary.total < rule.minTotal) {
    issues.push(
      `${summary.name}: テスト数 ${summary.total} が下限 ${rule.minTotal} 未満です`
    );
  }
  let ok = true;
  if (issues.length > 0) {
    ok = false;
  }
  return { ok, issues };
}

module.exports = {
  readJson,
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
  evaluateGate,
};
