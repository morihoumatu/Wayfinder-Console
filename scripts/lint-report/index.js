const fs = require("fs");
const path = require("path");

const { ROOT_DIR, REPORT_DIR, REPORT_PATH } = require("./config");
const { runCommand } = require("./utils");
const { buildToolReport } = require("./report");
const { renderReport } = require("./render");
const { parseEslintOutput } = require("./parsers/eslint");
const { parseStylelintOutput } = require("./parsers/stylelint");
const { parseHtmlhintOutput } = require("./parsers/htmlhint");
const { parseTscOutput } = require("./parsers/tsc");

/**
 * 各ツールを実行してレポートを生成する。
 */
function main() {
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
  const stylelintResult = runCommand("stylelint", [
    "**/*.css",
    "--formatter",
    "json",
    "--max-warnings",
    "0",
  ]);
  const htmlhintResult = runCommand("htmlhint", [
    "**/*.html",
    "--ignore",
    "**/reports/**,**/node_modules/**",
    "--format",
    "json",
  ]);
  const tscResult = runCommand("tsc", [
    "-p",
    "tsconfig.json",
    "--pretty",
    "false",
  ]);

  const tools = [
    buildToolReport("ESLint", eslintResult, parseEslintOutput),
    buildToolReport("Stylelint", stylelintResult, parseStylelintOutput),
    buildToolReport("HTMLHint", htmlhintResult, parseHtmlhintOutput),
    buildToolReport("TypeScript", tscResult, parseTscOutput),
  ];

  const totalErrors = tools.reduce(
    (sum, tool) => sum + tool.errors,
    0
  );
  const totalWarnings = tools.reduce(
    (sum, tool) => sum + tool.warnings,
    0
  );

  const reportData = {
    generatedAt: new Date().toISOString(),
    tools,
    totalErrors,
    totalWarnings,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, renderReport(reportData), "utf8");

  const relativeReportPath = path.relative(ROOT_DIR, REPORT_PATH);
  process.stdout.write(
    `Lint report written to ${relativeReportPath}\n`
  );
  process.stdout.write(`Errors: ${totalErrors}, Warnings: ${totalWarnings}\n`);

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
