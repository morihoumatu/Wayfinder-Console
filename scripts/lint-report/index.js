/**
 * lintレポート生成の実行処理をまとめる。
 * @file lintレポート生成の実行処理をまとめる。
 */
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");

// configからROOT_DIRとREPORT_DIRとREPORT_PATHを取得する。
const { ROOT_DIR, REPORT_DIR, REPORT_PATH } = require("./config");
// utilsからrunCommandを取得する。
const { runCommand } = require("./utils");
// reportからbuildToolReportを取得する。
const { buildToolReport } = require("./report");
// renderからrenderReportを取得する。
const { renderReport } = require("./render");
// eslintからparseEslintOutputを取得する。
const { parseEslintOutput } = require("./parsers/eslint");
// stylelintからparseStylelintOutputを取得する。
const { parseStylelintOutput } = require("./parsers/stylelint");
// htmlhintからparseHtmlhintOutputを取得する。
const { parseHtmlhintOutput } = require("./parsers/htmlhint");
// tscからparseTscOutputを取得する。
const { parseTscOutput } = require("./parsers/tsc");

/**
 * 各ツールを実行してレポートを生成する。
 */
function main() {
  // 結果を取得する。
  const eslintResult = runCommand("eslint", [
    "--ext",
    ".js",
    ".",
    "--rulesdir",
    "eslint-rules",
    "-f",
    "json",
    "--max-warnings",
    "0",
  ]);
  // 結果を取得する。
  const stylelintResult = runCommand("stylelint", [
    "**/*.css",
    "--formatter",
    "json",
    "--max-warnings",
    "0",
  ]);
  // 結果を取得する。
  const htmlhintResult = runCommand("htmlhint", [
    "**/*.html",
    "--ignore",
    "**/reports/**,**/node_modules/**",
    "--format",
    "json",
  ]);
  // 結果を取得する。
  const tscResult = runCommand("tsc", [
    "-p",
    "tsconfig.json",
    "--pretty",
    "false",
  ]);

  // toolsの一覧を用意する。
  const tools = [
    buildToolReport("ESLint", eslintResult, parseEslintOutput),
    buildToolReport("Stylelint", stylelintResult, parseStylelintOutput),
    buildToolReport("HTMLHint", htmlhintResult, parseHtmlhintOutput),
    buildToolReport("TypeScript", tscResult, parseTscOutput),
  ];

  // 件数を取得する。
  const totalErrors = tools.reduce(
    (sum, tool) => sum + tool.errors,
    0
  );
  // 件数を取得する。
  const totalWarnings = tools.reduce(
    (sum, tool) => sum + tool.warnings,
    0
  );

  // データをまとめる。
  const reportData = {
    generatedAt: new Date().toISOString(),
    tools,
    totalErrors,
    totalWarnings,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, renderReport(reportData), "utf8");

  // パス情報を取得する。
  const relativeReportPath = path.relative(ROOT_DIR, REPORT_PATH);
  process.stdout.write(
    `Lint report written to ${relativeReportPath}\n`
  );
  process.stdout.write(`Errors: ${totalErrors}, Warnings: ${totalWarnings}\n`);

  // 判定結果を取得する。
  const hasFailures = tools.some((tool) => tool.status === "fail");
  if (hasFailures) {
    process.stderr.write("Lint failed.\n");
    process.exitCode = 1;
    return;
  }
  process.exitCode = 0;
}

module.exports = {
  main,
};
