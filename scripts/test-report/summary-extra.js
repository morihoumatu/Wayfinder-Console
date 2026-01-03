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
    const thresholds = data.thresholds || {};
    const scores = data.scores || {};
    const keys = Object.keys(thresholds);
    let passed = 0;
    let failed = 0;
    keys.forEach((key) => {
      const threshold = toNumber(thresholds[key]);
      const score = toNumber(scores[key]);
      if (score >= threshold) {
        passed += 1;
      } else {
        failed += 1;
      }
    });
    const total = keys.length;
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
    const thresholds = data.thresholds || {};
    const metrics = data.metrics || {};
    const keys = Object.keys(thresholds);
    let passed = 0;
    let failed = 0;
    keys.forEach((key) => {
      const limit = toNumber(thresholds[key]);
      const actual = toNumber(metrics[key]);
      const ok =
        key === "requestsPerSecond" ? actual >= limit : actual <= limit;
      if (ok) {
        passed += 1;
      } else {
        failed += 1;
      }
    });
    const total = keys.length;
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
    let passed = 0;
    let failed = 0;
    data.checks.forEach((/** @type {{ status?: string }} */ check) => {
      if (check?.status === "pass") {
        passed += 1;
      } else {
        failed += 1;
      }
    });
    const total = data.checks.length;
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
