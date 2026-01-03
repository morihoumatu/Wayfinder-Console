/**
 * 動的検証の品質ゲートを判定する。
 * @file 動的検証の品質ゲートを判定する。
 */
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const REPORT_DIR = path.join(ROOT_DIR, "reports");
const VITEST_JSON_PATH = path.join(REPORT_DIR, "vitest-report.json");
const PLAYWRIGHT_JSON_PATH = path.join(REPORT_DIR, "playwright-report.json");
const CYPRESS_JSON_PATH = path.join(REPORT_DIR, "cypress", "index.json");

/**
 * @typedef {Object} ToolSummary
 * @property {string} name ツール名。
 * @property {string} status 状態(pass/fail/missing)。
 * @property {number} passed 成功数。
 * @property {number} failed 失敗数。
 * @property {number} skipped スキップ数。
 * @property {number} total 総数。
 */

/**
 * @typedef {Object} GateRule
 * @property {number} minTotal 最小テスト数。
 * @property {number} maxFailed 許容失敗数。
 * @property {number} maxSkipped 許容スキップ数。
 */

/** @type {{ vitest: GateRule, playwright: GateRule, cypress: GateRule }} */
const GATE_RULES = {
  vitest: { minTotal: 5, maxFailed: 0, maxSkipped: 0 },
  playwright: { minTotal: 1, maxFailed: 0, maxSkipped: 0 },
  cypress: { minTotal: 1, maxFailed: 0, maxSkipped: 0 },
};

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
 * @returns {ToolSummary} 集計結果。
 */
function summarizePlaywright(data) {
  /** @type {ToolSummary} */
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
 * @returns {ToolSummary} 集計結果。
 */
function summarizeCypress(data) {
  const stats = data && data.stats ? data.stats : null;
  /** @type {ToolSummary} */
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
 * @param {ToolSummary} summary 集計結果。
 * @param {GateRule} rule ゲート条件。
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
  const result = { ok, issues };
  return result;
}

/**
 * 品質ゲートを実行する。
 */
function main() {
  const vitestData = readJson(VITEST_JSON_PATH);
  const playwrightData = readJson(PLAYWRIGHT_JSON_PATH);
  const cypressData = readJson(CYPRESS_JSON_PATH);

  const summaries = [
    { summary: summarizeVitest(vitestData), rule: GATE_RULES.vitest, path: VITEST_JSON_PATH },
    {
      summary: summarizePlaywright(playwrightData),
      rule: GATE_RULES.playwright,
      path: PLAYWRIGHT_JSON_PATH,
    },
    { summary: summarizeCypress(cypressData), rule: GATE_RULES.cypress, path: CYPRESS_JSON_PATH },
  ];

  /** @type {string[]} */
  const allIssues = [];
  summaries.forEach((entry) => {
    const result = evaluateGate(entry.summary, entry.rule, entry.path);
    result.issues.forEach((issue) => {
      allIssues.push(issue);
    });
  });

  if (allIssues.length > 0) {
    process.stderr.write("[test-gate] 品質ゲートに失敗しました。\n");
    allIssues.forEach((issue) => {
      process.stderr.write(`[test-gate] ${issue}\n`);
    });
    process.exitCode = 1;
  } else {
    process.stdout.write("[test-gate] 品質ゲートを通過しました。\n");
    process.exitCode = 0;
  }
}

main();
