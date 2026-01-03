/**
 * Stylelint出力の解析をまとめる。
 * @file Stylelint出力の解析をまとめる。
 */
const {
  combineOutput,
  parseJsonFromText,
  buildMessage,
  toRelativePath,
  normalizeSeverity,
} = require("../utils");

/**
 * Stylelintの出力を解析する。
 * @param {any} result 実行結果。
 * @returns {any} 解析済みレポート。
 */
function parseStylelintOutput(result) {
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
    // parsedを条件で選ぶ。
    const parsed =
      parseJsonFromText(result.stdout) || parseJsonFromText(rawOutput);
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
          toolError: "Unable to parse Stylelint output.",
          rawOutput,
        };
      }
    } else if (!Array.isArray(parsed)) {
      report = {
        errors: 0,
        warnings: 0,
        files: [],
        toolError: "Unexpected Stylelint output.",
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
        /** @type {any[]} */
        const messages = [];
        // 一覧を条件で選ぶ。
        const warningList = Array.isArray(entry.warnings) ? entry.warnings : [];
        warningList.forEach((/** @type {any} */ warning) => {
          // 重大度を判定する。
          const severity = normalizeSeverity(warning.severity);
          if (severity === "error") {
            errors += 1;
          } else {
            warnings += 1;
          }
          messages.push(
            buildMessage({
              lineValue: warning.line,
              columnValue: warning.column,
              severityValue: severity,
              ruleValue: warning.rule || "",
              text: warning.text || "",
            })
          );
        });

        // エラーを条件で選ぶ。
        const parseErrors = Array.isArray(entry.parseErrors)
          ? entry.parseErrors
          : [];
        parseErrors.forEach((/** @type {any} */ parseError) => {
          errors += 1;
          messages.push(
            buildMessage({
              lineValue: parseError.line,
              columnValue: parseError.column,
              severityValue: "error",
              ruleValue: "parse-error",
              text: parseError.text || "Parse error.",
            })
          );
        });

        // オプションを条件で選ぶ。
        const invalidOptionWarnings = Array.isArray(entry.invalidOptionWarnings)
          ? entry.invalidOptionWarnings
          : [];
        invalidOptionWarnings.forEach((/** @type {any} */ invalidOption) => {
          errors += 1;
          messages.push(
            buildMessage({
              lineValue: null,
              columnValue: null,
              severityValue: "error",
              ruleValue: "invalid-option",
              text: invalidOption.text || "Invalid option.",
            })
          );
        });

        // deprecationsを条件で選ぶ。
        const deprecations = Array.isArray(entry.deprecations)
          ? entry.deprecations
          : [];
        deprecations.forEach((/** @type {any} */ deprecation) => {
          warnings += 1;
          messages.push(
            buildMessage({
              lineValue: null,
              columnValue: null,
              severityValue: "warning",
              ruleValue: "deprecation",
              text: deprecation.text || "Deprecated rule.",
            })
          );
        });

        if (messages.length > 0) {
          files.push({
            path: toRelativePath(entry.source),
            messages,
          });
        }
      });

      report = { errors, warnings, files, toolError: null, rawOutput };
    }
  }
  return report;
}

module.exports = {
  parseStylelintOutput,
};
