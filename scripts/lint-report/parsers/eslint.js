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
  // rawOutputを取得する。
  const rawOutput = combineOutput(result.stdout, result.stderr);
  // reportを後で設定するために用意する。
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
    // parsedを解析する。
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
      // エラーの初期値を定義する。
      let errors = 0;
      // warningsの初期値を定義する。
      let warnings = 0;

      parsed.forEach((entry) => {
        // 一覧を条件で選ぶ。
        const messageList = Array.isArray(entry.messages) ? entry.messages : [];
        if (messageList.length === 0) {
          return;
        }
        // メッセージを取得する。
        const messages = messageList.map((/** @type {any} */ message) => {
          // 重大度を判定する。
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
