/**
 * 品質ゲート向けの集計ロジックをまとめる。
 * @file 品質ゲート向けの集計ロジックをまとめる。
 */
"use strict";

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
 * @returns {any} 集計結果。
 */
function summarizeVitest(data) {
  // summaryをまとめる。
  let summary = {
    name: "Vitest",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
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
  // summaryをまとめる。
  let summary = {
    name: "Playwright",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  if (data && data.stats) {
    // passedを整形する。
    const passed = toNumber(data.stats.expected);
    // failedを用意する。
    const failed = toNumber(data.stats.unexpected) + toNumber(data.stats.flaky);
    // skippedを整形する。
    const skipped = toNumber(data.stats.skipped);
    // 件数を用意する。
    const total = passed + failed + skipped;
    // 状態を条件で選ぶ。
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
  // statsを条件で選ぶ。
  const stats = data && data.stats ? data.stats : null;
  // summaryをまとめる。
  let summary = {
    name: "Cypress",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
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
 * Lighthouseの集計を作成する。
 * @param {any | null} data LighthouseのJSONデータ。
 * @returns {any} 集計結果。
 */
function summarizeLighthouse(data) {
  // summaryをまとめる。
  let summary = {
    name: "Lighthouse",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
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
    };
  }
  return summary;
}

/**
 * 負荷テストの集計を作成する。
 * @param {any | null} data 負荷テストのJSONデータ。
 * @returns {any} 集計結果。
 */
function summarizeLoadTest(data) {
  // summaryをまとめる。
  let summary = {
    name: "Load Test",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
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
    };
  }
  return summary;
}

/**
 * セキュリティチェックの集計を作成する。
 * @param {any | null} data セキュリティのJSONデータ。
 * @returns {any} 集計結果。
 */
function summarizeSecurity(data) {
  // summaryをまとめる。
  let summary = {
    name: "Security",
    status: "missing",
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
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
    };
  }
  return summary;
}

module.exports = {
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
  summarizeLighthouse,
  summarizeLoadTest,
  summarizeSecurity,
};
