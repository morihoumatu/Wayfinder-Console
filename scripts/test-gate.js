/**
 * 動的検証の品質ゲートを判定する。
 * @file 動的検証の品質ゲートを判定する。
 */
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");
// coverageから必要な値を取得する。
const {
  COVERAGE_RULES,
  FILE_COVERAGE_RULES,
  summarizeCoverage,
  summarizeFileCoverages,
  evaluateCoverage,
  evaluateFileCoverageGate,
} = require("./test-gate/coverage");
// summaryから必要な値を取得する。
const {
  readJson,
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
  summarizeLighthouse,
  summarizeLoadTest,
  summarizeSecurity,
  evaluateGate,
} = require("./test-gate/summary");

// パスを組み立てる。
const ROOT_DIR = path.join(__dirname, "..");
// パスを組み立てる。
const REPORT_DIR = path.join(ROOT_DIR, "reports");
// パスを組み立てる。
const VITEST_JSON_PATH = path.join(REPORT_DIR, "vitest-report.json");
// パスを組み立てる。
const PLAYWRIGHT_JSON_PATH = path.join(REPORT_DIR, "playwright-report.json");
// パスを組み立てる。
const CYPRESS_JSON_PATH = path.join(REPORT_DIR, "cypress", "index.json");
// パスを組み立てる。
const LIGHTHOUSE_JSON_PATH = path.join(REPORT_DIR, "lighthouse-report.json");
// パスを組み立てる。
const LOAD_JSON_PATH = path.join(REPORT_DIR, "load-test-report.json");
// パスを組み立てる。
const SECURITY_JSON_PATH = path.join(REPORT_DIR, "security-report.json");
// パスを組み立てる。
const GATE_JSON_PATH = path.join(REPORT_DIR, "test-gate.json");
// パスを組み立てる。
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

/** @type {{
 *   vitest: GateRule,
 *   playwright: GateRule,
 *   cypress: GateRule,
 *   lighthouse: GateRule,
 *   load: GateRule,
 *   security: GateRule
 * }}
 */
const GATE_RULES = {
  vitest: { minTotal: 60, maxFailed: 0, maxSkipped: 0 },
  playwright: { minTotal: 40, maxFailed: 0, maxSkipped: 0 },
  cypress: { minTotal: 3, maxFailed: 0, maxSkipped: 0 },
  lighthouse: { minTotal: 4, maxFailed: 0, maxSkipped: 0 },
  load: { minTotal: 3, maxFailed: 0, maxSkipped: 0 },
  security: { minTotal: 7, maxFailed: 0, maxSkipped: 0 },
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
   *   coverageResult: { ok: boolean, issues: string[] },
   *   fileCoverageResult: { ok: boolean, issues: string[], files: any[] }
   * }}
   */
  { summaries, allIssues, coverageSummary, coverageResult, fileCoverageResult }
) {
  // toolsを取得する。
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
  // 状態を条件で選ぶ。
  const coverageStatus = coverageSummary
    ? coverageResult.ok && fileCoverageResult.ok
      ? "pass"
      : "fail"
    : "missing";
  // coverageをまとめる。
  const coverage = {
    status: coverageStatus,
    summary: coverageSummary,
    rules: COVERAGE_RULES,
    fileRules: FILE_COVERAGE_RULES,
    files: fileCoverageResult.files,
    reportPath: COVERAGE_JSON_PATH,
    issues: coverageResult.issues,
  };
  // 状態を条件で選ぶ。
  const status = allIssues.length > 0 ? "fail" : "pass";
  // reportをまとめる。
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
  // データを読み込む。
  const vitestData = readJson(VITEST_JSON_PATH);
  // データを読み込む。
  const playwrightData = readJson(PLAYWRIGHT_JSON_PATH);
  // データを読み込む。
  const cypressData = readJson(CYPRESS_JSON_PATH);
  // データを読み込む。
  const lighthouseData = readJson(LIGHTHOUSE_JSON_PATH);
  // データを読み込む。
  const loadData = readJson(LOAD_JSON_PATH);
  // データを読み込む。
  const securityData = readJson(SECURITY_JSON_PATH);
  // データを読み込む。
  const coverageData = readJson(COVERAGE_JSON_PATH);

  // summariesの一覧を用意する。
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
    {
      summary: summarizeLighthouse(lighthouseData),
      rule: GATE_RULES.lighthouse,
      path: LIGHTHOUSE_JSON_PATH,
    },
    {
      summary: summarizeLoadTest(loadData),
      rule: GATE_RULES.load,
      path: LOAD_JSON_PATH,
    },
    {
      summary: summarizeSecurity(securityData),
      rule: GATE_RULES.security,
      path: SECURITY_JSON_PATH,
    },
  ];

  /** @type {string[]} */
  const allIssues = [];
  summaries.forEach((entry) => {
    // 結果を取得する。
    const result = evaluateGate(entry.summary, entry.rule, entry.path);
    result.issues.forEach((issue) => {
      allIssues.push(issue);
    });
  });
  // coverageSummaryを取得する。
  const coverageSummary = summarizeCoverage(coverageData);
  // fileCoverageSummariesを取得する。
  const fileCoverageSummaries = summarizeFileCoverages(coverageData);
  // normalizedFileCoverageSummariesを取得する。
  const normalizedFileCoverageSummaries = fileCoverageSummaries.map((summary) => {
    // パスの参照を保持する。
    const filePath = summary.file;
    // パスを条件で選ぶ。
    const relativePath = path.isAbsolute(filePath)
      ? path.relative(ROOT_DIR, filePath)
      : filePath;
    return {
      ...summary,
      file: relativePath,
    };
  });
  // 結果を取得する。
  const coverageResult = evaluateCoverage(
    coverageSummary,
    COVERAGE_RULES,
    COVERAGE_JSON_PATH
  );
  coverageResult.issues.forEach((issue) => {
    allIssues.push(issue);
  });
  // 結果を取得する。
  const fileCoverageResult = evaluateFileCoverageGate({
    summaries: normalizedFileCoverageSummaries,
    rules: FILE_COVERAGE_RULES,
    reportPath: COVERAGE_JSON_PATH,
  });
  fileCoverageResult.issues.forEach((issue) => {
    allIssues.push(issue);
  });
  // gateReportを作成する。
  const gateReport = buildGateReport({
    summaries,
    allIssues,
    coverageSummary,
    coverageResult,
    fileCoverageResult,
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
