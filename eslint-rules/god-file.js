/**
 * ESLintのgod-fileルールを提供する。
 * @file ESLintのgod-fileルールを提供する。
 */
/* eslint-env node */
"use strict";

// DEFAULT_LIMITSをまとめる。
const DEFAULT_LIMITS = {
  maxFunctions: 30,
  maxLines: 300,
};

// limitを正規化する処理を定義する。
const normalizeLimit = (value, fallback) => {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
};

// limitsを読み取る処理を定義する。
const readLimits = (options) => {
  // optsを条件で選ぶ。
  const opts = options && typeof options === "object" ? options : {};
  return {
    maxFunctions: normalizeLimit(
      opts.maxFunctions,
      DEFAULT_LIMITS.maxFunctions
    ),
    maxLines: normalizeLimit(opts.maxLines, DEFAULT_LIMITS.maxLines),
  };
};

// lineCountを取得する処理を定義する。
const getLineCount = (node) => {
  // 判定結果を取得する。
  const hasLocation = Boolean(node && node.loc);
  // 件数を条件で選ぶ。
  const count = hasLocation
    ? node.loc.end.line - node.loc.start.line + 1
    : 0;
  return count;
};

// reportできるか判定する処理を定義する。
const shouldReport = (stats, limits) => {
  // tooManyFunctionsを用意する。
  const tooManyFunctions = stats.functions > limits.maxFunctions;
  // tooManyLinesを用意する。
  const tooManyLines = stats.lines > limits.maxLines;
  // 結果を条件で選ぶ。
  const result = tooManyFunctions || tooManyLines;
  return result;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Detect files that are too large.",
    },
    schema: [
      {
        type: "object",
        properties: {
          maxFunctions: { type: "integer", minimum: 0 },
          maxLines: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      godFile:
        "File exceeds size thresholds (functions {{functions}}/{{maxFunctions}}, " +
        "lines {{lines}}/{{maxLines}}).",
    },
  },
  create(context) {
    // limitsを読み込む。
    const limits = readLimits(context.options[0]);
    // 件数の初期値を定義する。
    let functionCount = 0;

    // countFunctionの処理を定義する。
    const countFunction = () => {
      functionCount += 1;
    };

    // checkProgramの処理を定義する。
    const checkProgram = (node) => {
      // linesを取得する。
      const lines = getLineCount(node);
      // statsをまとめる。
      const stats = {
        functions: functionCount,
        lines,
      };

      if (shouldReport(stats, limits)) {
        context.report({
          node,
          messageId: "godFile",
          data: {
            functions: stats.functions,
            maxFunctions: limits.maxFunctions,
            lines: stats.lines,
            maxLines: limits.maxLines,
          },
        });
      }
    };

    return {
      FunctionDeclaration: countFunction,
      FunctionExpression: countFunction,
      ArrowFunctionExpression: countFunction,
      "Program:exit": checkProgram,
    };
  },
};
