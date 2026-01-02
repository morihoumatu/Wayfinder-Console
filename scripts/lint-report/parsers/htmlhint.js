/**
 * HTMLHint出力の解析をまとめる。
 * @file HTMLHint出力の解析をまとめる。
 */
const {
  combineOutput,
  parseJsonOutput,
  buildMessage,
  toRelativePath,
} = require("../utils");

/**
 * HTMLHintの出力を解析する。
 * @param {any} result 実行結果。
 * @returns {any} 解析済みレポート。
 */
function parseHtmlhintOutput(result) {
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
          toolError: "Unable to parse HTMLHint output.",
          rawOutput,
        };
      }
    } else if (!Array.isArray(parsed)) {
      report = {
        errors: 0,
        warnings: 0,
        files: [],
        toolError: "Unexpected HTMLHint output.",
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
          const severity =
            message.type === "warning" ? "warning" : "error";
          if (severity === "error") {
            errors += 1;
          } else {
            warnings += 1;
          }
          const ruleValue =
            message.rule && typeof message.rule === "object"
              ? message.rule.id
              : message.rule;
          return buildMessage({
            lineValue: message.line,
            columnValue: message.col || message.column,
            severityValue: severity,
            ruleValue: ruleValue || "",
            text: message.message || "",
          });
        });
        files.push({
          path: toRelativePath(entry.file),
          messages,
        });
      });

      report = { errors, warnings, files, toolError: null, rawOutput };
    }
  }
  return report;
}

module.exports = {
  parseHtmlhintOutput,
};
