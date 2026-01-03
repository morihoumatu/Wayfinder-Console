/**
 * セキュリティヘッダーを検証する。
 * @file セキュリティヘッダーを検証する。
 */
const fs = require("fs");
const path = require("path");
const http = require("http");

const { ensureServer, stopServer } = require("./test-server");

const SERVER_URL = "http://localhost:3000";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_JSON_PATH = path.join(REPORT_DIR, "security-report.json");

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
    const actual = headers[rule.name] || "";
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
  let serverChild = null;
  let serverStarted = false;
  const startedAt = Date.now();
  try {
    const server = await ensureServer(SERVER_URL);
    serverChild = server.child;
    serverStarted = server.started;

    const headers = await fetchHeaders(SERVER_URL);
    const evaluation = evaluateHeaders(headers);
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
    const message = error instanceof Error ? error.message : "Unexpected error.";
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
  const message = error instanceof Error ? error.message : "Unexpected error.";
  process.stderr.write(`[security-check] ${message}\n`);
  process.exitCode = 1;
});
