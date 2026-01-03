/**
 * 負荷テストを実行する。
 * @file 負荷テストを実行する。
 */
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");
// autocannonモジュールを読み込む。
const autocannon = require("autocannon");

// test-serverからensureServerとstopServerを取得する。
const { ensureServer, stopServer } = require("./test-server");

// SERVER_URLの定数を定義する。
const SERVER_URL = "http://localhost:3000";
// パスを組み立てる。
const REPORT_DIR = path.join(__dirname, "..", "reports");
// パスを組み立てる。
const REPORT_JSON_PATH = path.join(REPORT_DIR, "load-test-report.json");

// LOAD_THRESHOLDSをまとめる。
const LOAD_THRESHOLDS = {
  p95: 800,
  errorRate: 0,
  requestsPerSecond: 50,
};

// オプションをまとめる。
const LOAD_OPTIONS = {
  connections: 10,
  duration: 5,
  pipelining: 1,
};

/**
 * autocannonを実行する。
 * @param {any} options 実行オプション。
 * @returns {Promise<any>} 実行結果。
 */
function runAutocannon(options) {
  return new Promise((resolve, reject) => {
    autocannon(
      options,
      (
        /** @type {Error | null} */ error,
        /** @type {any} */ result
      ) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
      }
    );
  });
}

/**
 * エラーレートを計算する。
 * @param {any} result 結果データ。
 * @returns {number} エラーレート。
 */
function getErrorRate(result) {
  // 件数を条件で選ぶ。
  const total = result?.requests?.total || 0;
  // エラーを用意する。
  const errors = (result?.errors || 0) + (result?.timeouts || 0);
  return total > 0 ? errors / total : 0;
}

/**
 * 負荷テスト結果を評価する。
 * @param {{ p95: number, errorRate: number, requestsPerSecond: number }} metrics 指標。
 * @returns {{ ok: boolean, issues: string[] }} 評価結果。
 */
function evaluateLoad(metrics) {
  /** @type {string[]} */
  const issues = [];
  if (metrics.p95 > LOAD_THRESHOLDS.p95) {
    issues.push(
      `Load(p95): ${metrics.p95.toFixed(1)}ms が上限 ${LOAD_THRESHOLDS.p95}ms を超過しています`
    );
  }
  if (metrics.errorRate > LOAD_THRESHOLDS.errorRate) {
    issues.push(
      `Load(errorRate): ${metrics.errorRate.toFixed(3)} が上限 ${LOAD_THRESHOLDS.errorRate} を超過しています`
    );
  }
  if (metrics.requestsPerSecond < LOAD_THRESHOLDS.requestsPerSecond) {
    issues.push(
      `Load(rps): ${metrics.requestsPerSecond.toFixed(1)} が下限 ${LOAD_THRESHOLDS.requestsPerSecond} を下回っています`
    );
  }
  return { ok: issues.length === 0, issues };
}

/**
 * レポートを書き込む。
 * @param {any} report レポートデータ。
 */
function writeReport(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2), "utf8");
}

/**
 * 負荷テストを実行する。
 */
async function main() {
  // serverChildの初期値を定義する。
  let serverChild = null;
  // serverStartedの初期値を定義する。
  let serverStarted = false;
  // startedAtを取得する。
  const startedAt = Date.now();
  try {
    // serverを取得する。
    const server = await ensureServer(SERVER_URL);
    serverChild = server.child;
    serverStarted = server.started;

    // 結果を取得する。
    const result = await runAutocannon({
      url: SERVER_URL,
      ...LOAD_OPTIONS,
    });

    // metricsをまとめる。
    const metrics = {
      p95: result?.latency?.p95 || 0,
      errorRate: getErrorRate(result),
      requestsPerSecond: result?.requests?.average || 0,
      totalRequests: result?.requests?.total || 0,
    };
    // evaluationを取得する。
    const evaluation = evaluateLoad(metrics);
    // reportをまとめる。
    const report = {
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      status: evaluation.ok ? "pass" : "fail",
      thresholds: LOAD_THRESHOLDS,
      metrics,
      issues: evaluation.issues,
      options: LOAD_OPTIONS,
    };

    writeReport(report);

    if (!evaluation.ok) {
      evaluation.issues.forEach((issue) => {
        process.stderr.write(`[load-test] ${issue}\n`);
      });
      process.exitCode = 1;
    } else {
      process.stdout.write("[load-test] 負荷テストの閾値を満たしました。\n");
      process.exitCode = 0;
    }
  } catch (error) {
    // メッセージを条件で選ぶ。
    const message = error instanceof Error ? error.message : "Unexpected error.";
    // reportをまとめる。
    const report = {
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      status: "fail",
      thresholds: LOAD_THRESHOLDS,
      metrics: {},
      issues: [`Load: ${message}`],
      options: LOAD_OPTIONS,
    };
    writeReport(report);
    process.stderr.write(`[load-test] ${message}\n`);
    process.exitCode = 1;
  } finally {
    stopServer(serverChild, serverStarted);
  }
}

main().catch((error) => {
  // メッセージを条件で選ぶ。
  const message = error instanceof Error ? error.message : "Unexpected error.";
  process.stderr.write(`[load-test] ${message}\n`);
  process.exitCode = 1;
});
