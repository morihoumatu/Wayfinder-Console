/**
 * 追加ツールの集計をまとめる。
 * @file 追加ツールの集計をまとめる。
 */
const { toNumber } = require("./summary");

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
 * Lighthouseの集計を作成する。
 * @param {any | null} data LighthouseのJSONデータ。
 * @param {string | null} reportLink レポートリンク。
 * @returns {ToolSummary} 集計結果。
 */
function summarizeLighthouse(data, reportLink) {
  /** @type {ToolSummary} */
  let summary = {
    name: "Lighthouse",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    durationMs: null,
    reportLink,
  };
  if (data) {
    // thresholdsを条件で選ぶ。
    const thresholds = data.thresholds || {};
    // scoresを条件で選ぶ。
    const scores = data.scores || {};
    // キーを取得する。
    const keys = Object.keys(thresholds);
    // passedの初期値を定義する。
    let passed = 0;
    // failedの初期値を定義する。
    let failed = 0;
    keys.forEach((key) => {
      // thresholdを整形する。
      const threshold = toNumber(thresholds[key]);
      // scoreを整形する。
      const score = toNumber(scores[key]);
      if (score >= threshold) {
        passed += 1;
      } else {
        failed += 1;
      }
    });
    // 件数の参照を保持する。
    const total = keys.length;
    // 状態を条件で選ぶ。
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    summary = {
      name: "Lighthouse",
      status,
      passed,
      failed,
      skipped: 0,
      total,
      durationMs: toNumber(data.durationMs) || null,
      reportLink,
    };
  }
  return summary;
}

/**
 * 負荷テストの集計を作成する。
 * @param {any | null} data 負荷テストのJSONデータ。
 * @param {string | null} reportLink レポートリンク。
 * @returns {ToolSummary} 集計結果。
 */
function summarizeLoadTest(data, reportLink) {
  /** @type {ToolSummary} */
  let summary = {
    name: "Load Test",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    durationMs: null,
    reportLink,
  };
  if (data) {
    // thresholdsを条件で選ぶ。
    const thresholds = data.thresholds || {};
    // metricsを条件で選ぶ。
    const metrics = data.metrics || {};
    // キーを取得する。
    const keys = Object.keys(thresholds);
    // passedの初期値を定義する。
    let passed = 0;
    // failedの初期値を定義する。
    let failed = 0;
    keys.forEach((key) => {
      // limitを整形する。
      const limit = toNumber(thresholds[key]);
      // actualを整形する。
      const actual = toNumber(metrics[key]);
      // okを条件で選ぶ。
      const ok =
        key === "requestsPerSecond" ? actual >= limit : actual <= limit;
      if (ok) {
        passed += 1;
      } else {
        failed += 1;
      }
    });
    // 件数の参照を保持する。
    const total = keys.length;
    // 状態を条件で選ぶ。
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    summary = {
      name: "Load Test",
      status,
      passed,
      failed,
      skipped: 0,
      total,
      durationMs: toNumber(data.durationMs) || null,
      reportLink,
    };
  }
  return summary;
}

/**
 * セキュリティチェックの集計を作成する。
 * @param {any | null} data セキュリティのJSONデータ。
 * @param {string | null} reportLink レポートリンク。
 * @returns {ToolSummary} 集計結果。
 */
function summarizeSecurity(data, reportLink) {
  /** @type {ToolSummary} */
  let summary = {
    name: "Security",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    durationMs: null,
    reportLink,
  };
  if (data && Array.isArray(data.checks)) {
    // passedの初期値を定義する。
    let passed = 0;
    // failedの初期値を定義する。
    let failed = 0;
    data.checks.forEach((/** @type {{ status?: string }} */ check) => {
      if (check?.status === "pass") {
        passed += 1;
      } else {
        failed += 1;
      }
    });
    // 件数の参照を保持する。
    const total = data.checks.length;
    // 状態を条件で選ぶ。
    const status = failed > 0 ? "fail" : total > 0 ? "pass" : "missing";
    summary = {
      name: "Security",
      status,
      passed,
      failed,
      skipped: 0,
      total,
      durationMs: toNumber(data.durationMs) || null,
      reportLink,
    };
  }
  return summary;
}

module.exports = {
  summarizeLighthouse,
  summarizeLoadTest,
  summarizeSecurity,
};
