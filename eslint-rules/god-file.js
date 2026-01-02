/* eslint-env node */
"use strict";

const DEFAULT_LIMITS = {
  maxFunctions: 30,
  maxLines: 300,
};

const normalizeLimit = (value, fallback) => {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
};

const readLimits = (options) => {
  const opts = options && typeof options === "object" ? options : {};
  return {
    maxFunctions: normalizeLimit(
      opts.maxFunctions,
      DEFAULT_LIMITS.maxFunctions
    ),
    maxLines: normalizeLimit(opts.maxLines, DEFAULT_LIMITS.maxLines),
  };
};

const getLineCount = (node) => {
  const hasLocation = Boolean(node && node.loc);
  const count = hasLocation
    ? node.loc.end.line - node.loc.start.line + 1
    : 0;
  return count;
};

const shouldReport = (stats, limits) => {
  const tooManyFunctions = stats.functions > limits.maxFunctions;
  const tooManyLines = stats.lines > limits.maxLines;
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
    const limits = readLimits(context.options[0]);
    let functionCount = 0;

    const countFunction = () => {
      functionCount += 1;
    };

    const checkProgram = (node) => {
      const lines = getLineCount(node);
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
