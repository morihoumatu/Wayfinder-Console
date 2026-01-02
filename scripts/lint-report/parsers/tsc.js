const {
  TSC_REGEX_PAREN,
  TSC_REGEX_COLON,
  TSC_REGEX_GLOBAL,
} = require("../config");
const {
  combineOutput,
  toRelativePath,
  buildMessage,
  normalizeSeverity,
} = require("../utils");

/**
 * マッチ結果の必要グループを取得する。
 * @param {RegExpMatchArray | null} match マッチ結果。
 * @param {number} expectedCount 必要なグループ数。
 * @returns {RegExpMatchArray | null} 利用可能なグループ。
 */
function getMatchGroups(match, expectedCount) {
  let groups = null;
  if (match) {
    let valid = true;
    for (let i = 1; i <= expectedCount; i += 1) {
      if (typeof match[i] !== "string") {
        valid = false;
        break;
      }
    }
    if (valid) {
      groups = match;
    }
  }
  return groups;
}

/**
 * TypeScriptのエラー行を解析する。
 * @param {string} line 入力行。
 * @returns {any | null} 診断情報またはnull。
 */
function parseTscLine(line) {
  const matchParen = getMatchGroups(line.match(TSC_REGEX_PAREN), 6);
  let parsed = null;
  if (matchParen) {
    parsed = {
      filePath: String(matchParen[1]).trim(),
      line: Number.parseInt(String(matchParen[2]), 10),
      column: Number.parseInt(String(matchParen[3]), 10),
      severity: normalizeSeverity(String(matchParen[4])),
      rule: `TS${String(matchParen[5])}`,
      message: String(matchParen[6]).trim(),
    };
  } else {
    const matchColon = getMatchGroups(line.match(TSC_REGEX_COLON), 6);
    if (matchColon) {
      parsed = {
        filePath: String(matchColon[1]).trim(),
        line: Number.parseInt(String(matchColon[2]), 10),
        column: Number.parseInt(String(matchColon[3]), 10),
        severity: normalizeSeverity(String(matchColon[4])),
        rule: `TS${String(matchColon[5])}`,
        message: String(matchColon[6]).trim(),
      };
    } else {
      const matchGlobal = getMatchGroups(line.match(TSC_REGEX_GLOBAL), 3);
      if (matchGlobal) {
        parsed = {
          filePath: "[tsc]",
          line: null,
          column: null,
          severity: normalizeSeverity(String(matchGlobal[1])),
          rule: `TS${String(matchGlobal[2])}`,
          message: String(matchGlobal[3]).trim(),
        };
      }
    }
  }
  return parsed;
}

/**
 * TypeScriptの出力を解析する。
 * @param {any} result 実行結果。
 * @returns {any} 解析済みレポート。
 */
function parseTscOutput(result) {
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
  } else if (rawOutput.length === 0) {
    report = { errors: 0, warnings: 0, files: [], toolError: null, rawOutput };
  } else {
    const lines = rawOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    /** @type {any[]} */
    const diagnostics = [];

    lines.forEach((line) => {
      const parsed = parseTscLine(line);
      if (parsed) {
        diagnostics.push(parsed);
      }
    });

    if (diagnostics.length === 0) {
      report = {
        errors: 0,
        warnings: 0,
        files: [],
        toolError: "Unable to parse TypeScript output.",
        rawOutput,
      };
    } else {
      let errors = 0;
      let warnings = 0;
      const fileMap = new Map();

      diagnostics.forEach((diagnostic) => {
        if (diagnostic.severity === "error") {
          errors += 1;
        } else {
          warnings += 1;
        }
        const filePathValue = toRelativePath(diagnostic.filePath);
        let entry = fileMap.get(filePathValue);
        if (!entry) {
          entry = { path: filePathValue, messages: [] };
          fileMap.set(filePathValue, entry);
        }
        entry.messages.push(
          buildMessage({
            lineValue: diagnostic.line,
            columnValue: diagnostic.column,
            severityValue: diagnostic.severity,
            ruleValue: diagnostic.rule,
            text: diagnostic.message,
          })
        );
      });

      report = {
        errors,
        warnings,
        files: Array.from(fileMap.values()),
        toolError: null,
        rawOutput,
      };
    }
  }
  return report;
}

module.exports = {
  parseTscLine,
  parseTscOutput,
};
