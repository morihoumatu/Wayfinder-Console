/**
 * Lighthouseのパフォーマンスチェックを実行する。
 * @file Lighthouseのパフォーマンスチェックを実行する。
 */
const fs = require("fs");
const path = require("path");
const lighthouseModule = /** @type {any} */ (require("lighthouse"));
const lighthouse = lighthouseModule.default || lighthouseModule;
const chromeLauncher = require("chrome-launcher");

const { ensureServer, stopServer } = require("./test-server");

const SERVER_URL = "http://localhost:3000";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_JSON_PATH = path.join(REPORT_DIR, "lighthouse-report.json");
const REPORT_HTML_PATH = path.join(REPORT_DIR, "lighthouse-report.html");

const CATEGORY_THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.9,
  seo: 0.9,
};

const LIGHTHOUSE_CONFIG =
  lighthouseModule.desktopConfig || lighthouseModule.defaultConfig || null;

/**
 * スコアを数値化する。
 * @param {unknown} value スコア値。
 * @returns {number} 正規化スコア。
 */
function normalizeScore(value) {
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
  const actual = (score * 100).toFixed(1);
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
    const threshold = normalizeScore(thresholds[key]);
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
  let serverChild = null;
  let serverStarted = false;
  let chrome = null;
  const startedAt = Date.now();
  try {
    const server = await ensureServer(SERVER_URL);
    serverChild = server.child;
    serverStarted = server.started;

    chrome = await chromeLauncher.launch({
      chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"],
    });

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

    const scores = extractScores(runnerResult.lhr);
    const evaluation = evaluateScores(scores, CATEGORY_THRESHOLDS);
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
    const message = error instanceof Error ? error.message : "Unexpected error.";
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
  const message = error instanceof Error ? error.message : "Unexpected error.";
  process.stderr.write(`[perf-check] ${message}\n`);
  process.exitCode = 1;
});
