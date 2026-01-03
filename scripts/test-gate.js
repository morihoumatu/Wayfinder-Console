/**
 * 動的検証の品質ゲートを判定する。
 * @file 動的検証の品質ゲートを判定する。
 */
const fs = require("fs");
const path = require("path");
const {
  COVERAGE_RULES,
  summarizeCoverage,
  evaluateCoverage,
} = require("./test-gate/coverage");
const {
  readJson,
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
  evaluateGate,
} = require("./test-gate/summary");

const ROOT_DIR = path.join(__dirname, "..");
const REPORT_DIR = path.join(ROOT_DIR, "reports");
const VITEST_JSON_PATH = path.join(REPORT_DIR, "vitest-report.json");
const PLAYWRIGHT_JSON_PATH = path.join(REPORT_DIR, "playwright-report.json");
const CYPRESS_JSON_PATH = path.join(REPORT_DIR, "cypress", "index.json");
const GATE_JSON_PATH = path.join(REPORT_DIR, "test-gate.json");
const COVERAGE_JSON_PATH = path.join(
  REPORT_DIR,
  "vitest-coverage",
  "coverage-summary.json"
);

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
  vitest: { minTotal: 30, maxFailed: 0, maxSkipped: 0 },
  playwright: { minTotal: 3, maxFailed: 0, maxSkipped: 0 },
  cypress: { minTotal: 3, maxFailed: 0, maxSkipped: 0 },
};


/**
 * 品質ゲートのレポートデータを作成する。
 * @param {any} options レポート作成オプション。
 * @returns {any} レポートデータ。
 */
function buildGateReport(
  /**
   * @type {{
   *   summaries: Array<{ summary: ToolSummary, rule: GateRule, path: string }>,
   *   allIssues: string[],
   *   coverageSummary: { lines: number, statements: number, functions: number, branches: number } | null,
   *   coverageResult: { ok: boolean, issues: string[] }
   * }}
   */
  { summaries, allIssues, coverageSummary, coverageResult }
) {
  const tools = summaries.map((entry) => ({
    name: entry.summary.name,
    status: entry.summary.status,
    passed: entry.summary.passed,
    failed: entry.summary.failed,
    skipped: entry.summary.skipped,
    total: entry.summary.total,
    rule: entry.rule,
    reportPath: entry.path,
  }));
  const coverageStatus = coverageSummary
    ? coverageResult.ok
      ? "pass"
      : "fail"
    : "missing";
  const coverage = {
    status: coverageStatus,
    summary: coverageSummary,
    rules: COVERAGE_RULES,
    reportPath: COVERAGE_JSON_PATH,
    issues: coverageResult.issues,
  };
  const status = allIssues.length > 0 ? "fail" : "pass";
  const report = {
    generatedAt: new Date().toISOString(),
    status,
    issues: allIssues,
    tools,
    coverage,
  };
  return report;
}

/**
 * 品質ゲートを実行する。
 */
function main() {
  const vitestData = readJson(VITEST_JSON_PATH);
  const playwrightData = readJson(PLAYWRIGHT_JSON_PATH);
  const cypressData = readJson(CYPRESS_JSON_PATH);
  const coverageData = readJson(COVERAGE_JSON_PATH);

  const summaries = [
    {
      summary: summarizeVitest(vitestData),
      rule: GATE_RULES.vitest,
      path: VITEST_JSON_PATH,
    },
    {
      summary: summarizePlaywright(playwrightData),
      rule: GATE_RULES.playwright,
      path: PLAYWRIGHT_JSON_PATH,
    },
    {
      summary: summarizeCypress(cypressData),
      rule: GATE_RULES.cypress,
      path: CYPRESS_JSON_PATH,
    },
  ];

  /** @type {string[]} */
  const allIssues = [];
  summaries.forEach((entry) => {
    const result = evaluateGate(entry.summary, entry.rule, entry.path);
    result.issues.forEach((issue) => {
      allIssues.push(issue);
    });
  });
  const coverageSummary = summarizeCoverage(coverageData);
  const coverageResult = evaluateCoverage(
    coverageSummary,
    COVERAGE_RULES,
    COVERAGE_JSON_PATH
  );
  coverageResult.issues.forEach((issue) => {
    allIssues.push(issue);
  });
  const gateReport = buildGateReport({
    summaries,
    allIssues,
    coverageSummary,
    coverageResult,
  });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(GATE_JSON_PATH, JSON.stringify(gateReport, null, 2), "utf8");

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
