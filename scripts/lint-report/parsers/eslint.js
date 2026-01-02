/**
 * ESLint出力の解析をまとめる。
 * @file ESLint出力の解析をまとめる。
 */
const {
  combineOutput,
  parseJsonOutput,
  buildMessage,
  toRelativePath,
} = require("../utils");

/**
 * ESLintの出力を解析する。
 * @param {any} result 実行結果。
 * @returns {any} 解析済みレポート。
 */
function parseEslintOutput(result) {
  const rawOutput = combineOutput(result.stdout, result.stderr);
  let report;
  if (result.hasError) {
    report = {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Command failed.",
      rawOutput,
    };
  } else {
    const parsed = parseJsonOutput(result.stdout);
    if (!parsed) {
      if (rawOutput.length === 0) {
        report = {
          errors: 0,
          warnings: 0,
          files: [],
          toolError: null,
          rawOutput,
        };
      } else {
        report = {
          errors: 0,
          warnings: 0,
          files: [],
          toolError: "Unable to parse ESLint output.",
          rawOutput,
        };
      }
    } else if (!Array.isArray(parsed)) {
      report = {
        errors: 0,
        warnings: 0,
        files: [],
        toolError: "Unexpected ESLint output.",
        rawOutput,
      };
    } else {
      /** @type {any[]} */
      const files = [];
      let errors = 0;
      let warnings = 0;

      parsed.forEach((entry) => {
        const messageList = Array.isArray(entry.messages) ? entry.messages : [];
        if (messageList.length === 0) {
          return;
        }
        const messages = messageList.map((/** @type {any} */ message) => {
          const severity = message.severity === 2 ? "error" : "warning";
          if (severity === "error") {
            errors += 1;
          } else {
            warnings += 1;
          }
          return buildMessage({
            lineValue: message.line,
            columnValue: message.column,
            severityValue: severity,
            ruleValue: message.ruleId || "",
            text: message.message || "",
          });
        });
        files.push({
          path: toRelativePath(entry.filePath),
          messages,
        });
      });

      report = { errors, warnings, files, toolError: null, rawOutput };
    }
  }
  return report;
}

module.exports = {
  parseEslintOutput,
};
