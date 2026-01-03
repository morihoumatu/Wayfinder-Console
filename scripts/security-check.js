/**
 * セキュリティヘッダーを検証する。
 * @file セキュリティヘッダーを検証する。
 */
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");
// httpモジュールを読み込む。
const http = require("http");

// test-serverからensureServerとstopServerを取得する。
const { ensureServer, stopServer } = require("./test-server");

// SERVER_URLの定数を定義する。
const SERVER_URL = "http://localhost:3000";
// パスを組み立てる。
const REPORT_DIR = path.join(__dirname, "..", "reports");
// パスを組み立てる。
const REPORT_JSON_PATH = path.join(REPORT_DIR, "security-report.json");

// HEADER_RULESの一覧を用意する。
const HEADER_RULES = [
  { name: "x-content-type-options", expected: "nosniff" },
  { name: "x-frame-options", expected: "DENY" },
  { name: "referrer-policy", expected: "strict-origin-when-cross-origin" },
  {
    name: "permissions-policy",
    includes: ["geolocation=()", "microphone=()", "camera=()"],
  },
  {
    name: "content-security-policy",
    includes: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ],
  },
  { name: "cross-origin-opener-policy", expected: "same-origin" },
  { name: "cross-origin-resource-policy", expected: "same-origin" },
];

/**
 * ヘッダー値を文字列化する。
 * @param {string | string[] | undefined} value ヘッダー値。
 * @returns {string} 正規化値。
 */
function normalizeHeaderValue(value) {
  // normalizedの初期値を定義する。
  let normalized = "";
  if (Array.isArray(value)) {
    normalized = value.join(", ");
  } else if (value) {
    normalized = value;
  }
  return normalized;
}

/**
 * セキュリティヘッダーを取得する。
 * @param {string} urlString 対象URL。
 * @returns {Promise<Record<string, string>>} ヘッダー一覧。
 */
function fetchHeaders(urlString) {
  return new Promise((resolve, reject) => {
    // リクエストを取得する。
    const request = http.get(urlString, (res) => {
      /** @type {Record<string, string>} */
      const headers = {};
      Object.keys(res.headers || {}).forEach((key) => {
        headers[key.toLowerCase()] = normalizeHeaderValue(res.headers[key]);
      });
      res.resume();
      resolve(headers);
    });
    request.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * ルールに基づいてヘッダーを評価する。
 * @param {Record<string, string>} headers ヘッダー一覧。
 * @returns {{ checks: any[], issues: string[], ok: boolean }} 評価結果。
 */
function evaluateHeaders(headers) {
  /** @type {any[]} */
  const checks = [];
  /** @type {string[]} */
  const issues = [];
  HEADER_RULES.forEach((rule) => {
    // actualを条件で選ぶ。
    const actual = headers[rule.name] || "";
    // okの初期値を定義する。
    let ok = true;
    if (rule.expected && actual !== rule.expected) {
      ok = false;
    }
    if (rule.includes) {
      rule.includes.forEach((fragment) => {
        if (!actual.includes(fragment)) {
          ok = false;
        }
      });
    }
    checks.push({
      name: rule.name,
      expected: rule.expected || rule.includes || "",
      actual,
      status: ok ? "pass" : "fail",
    });
    if (!ok) {
      issues.push(
        `Security(${rule.name}): 想定と一致しません (actual="${actual}")`
      );
    }
  });
  return { checks, issues, ok: issues.length === 0 };
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
 * セキュリティチェックを実行する。
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

    // headersを取得する。
    const headers = await fetchHeaders(SERVER_URL);
    // evaluationを取得する。
    const evaluation = evaluateHeaders(headers);
    // reportをまとめる。
    const report = {
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      status: evaluation.ok ? "pass" : "fail",
      checks: evaluation.checks,
      issues: evaluation.issues,
    };
    writeReport(report);

    if (!evaluation.ok) {
      evaluation.issues.forEach((issue) => {
        process.stderr.write(`[security-check] ${issue}\n`);
      });
      process.exitCode = 1;
    } else {
      process.stdout.write("[security-check] セキュリティヘッダーを確認しました。\n");
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
      checks: [],
      issues: [`Security: ${message}`],
    };
    writeReport(report);
    process.stderr.write(`[security-check] ${message}\n`);
    process.exitCode = 1;
  } finally {
    stopServer(serverChild, serverStarted);
  }
}

main().catch((error) => {
  // メッセージを条件で選ぶ。
  const message = error instanceof Error ? error.message : "Unexpected error.";
  process.stderr.write(`[security-check] ${message}\n`);
  process.exitCode = 1;
});
