/**
 * Lighthouseのパフォーマンスチェックを実行する。
 * @file Lighthouseのパフォーマンスチェックを実行する。
 */
// fsモジュールを読み込む。
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");
// lighthouseモジュールを読み込む。
const lighthouseModule = /** @type {any} */ (require("lighthouse"));
// Lighthouse本体を取得する。
const lighthouse = lighthouseModule.default || lighthouseModule;
// chrome-launcherモジュールを読み込む。
const chromeLauncher = require("chrome-launcher");

// test-serverからensureServerとstopServerを取得する。
const { ensureServer, stopServer } = require("./test-server");

// SERVER_URLの定数を定義する。
const SERVER_URL = "http://localhost:3000";
// パスを組み立てる。
const REPORT_DIR = path.join(__dirname, "..", "reports");
// パスを組み立てる。
const REPORT_JSON_PATH = path.join(REPORT_DIR, "lighthouse-report.json");
// パスを組み立てる。
const REPORT_HTML_PATH = path.join(REPORT_DIR, "lighthouse-report.html");

// CATEGORY_THRESHOLDSをまとめる。
const CATEGORY_THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.9,
  seo: 0.9,
};

// 設定を条件で選ぶ。
const LIGHTHOUSE_CONFIG =
  lighthouseModule.desktopConfig || lighthouseModule.defaultConfig || null;

/**
 * スコアを数値化する。
 * @param {unknown} value スコア値。
 * @returns {number} 正規化スコア。
 */
function normalizeScore(value) {
  // scoreの初期値を定義する。
  let score = 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    score = value;
  }
  return score;
}

/**
 * カテゴリ評価の課題を作成する。
 * @param {string} key カテゴリ名。
 * @param {number} score スコア。
 * @param {number} threshold 閾値。
 * @returns {string} 課題メッセージ。
 */
function buildIssue(key, score, threshold) {
  // actualを整形する。
  const actual = (score * 100).toFixed(1);
  // limitを整形する。
  const limit = (threshold * 100).toFixed(1);
  return `Lighthouse(${key}): ${actual} が下限 ${limit} を下回っています`;
}

/**
 * スコアを評価して課題を抽出する。
 * @param {Record<string, number>} scores スコア一覧。
 * @param {Record<string, number>} thresholds 閾値一覧。
 * @returns {{ ok: boolean, issues: string[] }} 評価結果。
 */
function evaluateScores(scores, thresholds) {
  /** @type {string[]} */
  const issues = [];
  Object.keys(thresholds).forEach((key) => {
    // thresholdを正規化する。
    const threshold = normalizeScore(thresholds[key]);
    // scoreを正規化する。
    const score = normalizeScore(scores[key]);
    if (score < threshold) {
      issues.push(buildIssue(key, score, threshold));
    }
  });
  return { ok: issues.length === 0, issues };
}

/**
 * Lighthouseスコアを抽出する。
 * @param {any} lhr Lighthouse結果。
 * @returns {Record<string, number>} スコア一覧。
 */
function extractScores(lhr) {
  return {
    performance: normalizeScore(lhr?.categories?.performance?.score),
    accessibility: normalizeScore(lhr?.categories?.accessibility?.score),
    "best-practices": normalizeScore(lhr?.categories?.["best-practices"]?.score),
    seo: normalizeScore(lhr?.categories?.seo?.score),
  };
}

/**
 * レポートを書き込む。
 * @param {any} report レポートデータ。
 * @param {string | null} html HTML文字列。
 */
function writeReport(report, html) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2), "utf8");
  if (html) {
    fs.writeFileSync(REPORT_HTML_PATH, html, "utf8");
  }
}

/**
 * Lighthouseチェックを実行する。
 */
async function main() {
  // serverChildの初期値を定義する。
  let serverChild = null;
  // serverStartedの初期値を定義する。
  let serverStarted = false;
  // chromeの初期値を定義する。
  let chrome = null;
  // startedAtを取得する。
  const startedAt = Date.now();
  try {
    // serverを取得する。
    const server = await ensureServer(SERVER_URL);
    serverChild = server.child;
    serverStarted = server.started;

    chrome = await chromeLauncher.launch({
      chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"],
    });

    // 結果を取得する。
    const runnerResult = await lighthouse(
      SERVER_URL,
      {
        output: "html",
        logLevel: "error",
        port: chrome.port,
        onlyCategories: Object.keys(CATEGORY_THRESHOLDS),
      },
      LIGHTHOUSE_CONFIG || undefined
    );

    // scoresを取得する。
    const scores = extractScores(runnerResult.lhr);
    // evaluationを取得する。
    const evaluation = evaluateScores(scores, CATEGORY_THRESHOLDS);
    // reportをまとめる。
    const report = {
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      status: evaluation.ok ? "pass" : "fail",
      scores,
      thresholds: CATEGORY_THRESHOLDS,
      issues: evaluation.issues,
      reportPath: REPORT_HTML_PATH,
    };

    writeReport(report, runnerResult.report);

    if (!evaluation.ok) {
      evaluation.issues.forEach((issue) => {
        process.stderr.write(`[perf-check] ${issue}\n`);
      });
      process.exitCode = 1;
    } else {
      process.stdout.write("[perf-check] Lighthouseの閾値を満たしました。\n");
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
      scores: {},
      thresholds: CATEGORY_THRESHOLDS,
      issues: [`Lighthouse: ${message}`],
      reportPath: REPORT_HTML_PATH,
    };
    writeReport(report, null);
    process.stderr.write(`[perf-check] ${message}\n`);
    process.exitCode = 1;
  } finally {
    if (chrome) {
      await chrome.kill();
    }
    stopServer(serverChild, serverStarted);
  }
}

main().catch((error) => {
  // メッセージを条件で選ぶ。
  const message = error instanceof Error ? error.message : "Unexpected error.";
  process.stderr.write(`[perf-check] ${message}\n`);
  process.exitCode = 1;
});
