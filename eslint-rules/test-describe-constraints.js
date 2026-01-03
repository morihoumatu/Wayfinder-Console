/**
 * テストファイルのdescribe制約を検知するESLintルールを提供する。
 * @file テストファイルのdescribe制約を検知する。
 */
/* eslint-env node */
"use strict";

const DESCRIBE_MODIFIERS = new Set([
  "only",
  "skip",
  "fixme",
  "serial",
  "parallel",
  "concurrent",
]);

const isIdentifierNamed = (node, name) => {
  let result = false;
  if (node && node.type === "Identifier") {
    result = node.name === name;
  }
  return result;
};

const isDescribeCall = (node) => {
  let result = false;
  if (node && node.type === "CallExpression") {
    const callee = node.callee;
    if (isIdentifierNamed(callee, "describe")) {
      result = true;
    } else if (callee && callee.type === "MemberExpression" && !callee.computed) {
      const object = callee.object;
      const property = callee.property;
      if (isIdentifierNamed(object, "describe") && property && property.type === "Identifier") {
        result = DESCRIBE_MODIFIERS.has(property.name);
      }
    }
  }
  return result;
};

const findDescribeCallback = (node) => {
  let callback = null;
  if (node && Array.isArray(node.arguments)) {
    for (let index = node.arguments.length - 1; index >= 0; index -= 1) {
      const arg = node.arguments[index];
      if (
        arg &&
        (arg.type === "FunctionExpression" || arg.type === "ArrowFunctionExpression")
      ) {
        callback = arg;
        break;
      }
    }
  }
  return callback;
};

const isExpectCall = (node) => {
  let result = false;
  if (node && node.type === "CallExpression") {
    const callee = node.callee;
    if (isIdentifierNamed(callee, "expect")) {
      result = true;
    } else if (callee && callee.type === "MemberExpression" && !callee.computed) {
      const object = callee.object;
      if (isIdentifierNamed(object, "expect")) {
        result = true;
      }
    }
  }
  return result;
};

const countExpectCalls = (node) => {
  let count = 0;
  if (node) {
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== "object") {
        continue;
      }
      if (isExpectCall(current)) {
        count += 1;
      }
      Object.keys(current).forEach((key) => {
        if (key === "parent") {
          return;
        }
        const value = current[key];
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item && typeof item === "object") {
              stack.push(item);
            }
          });
        } else if (value && typeof value === "object") {
          stack.push(value);
        }
      });
    }
  }
  return count;
};

const hasAdjacentComment = (node, sourceCode) => {
  let result = false;
  if (node && sourceCode && node.loc) {
    const comments = sourceCode.getCommentsBefore(node);
    if (comments.length > 0) {
      const last = comments[comments.length - 1];
      if (last && last.loc) {
        result = last.loc.end.line === node.loc.start.line - 1;
      }
    }
  }
  return result;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a comment above each describe and exactly one expect per describe.",
    },
    schema: [],
    messages: {
      missingComment: "Describe must have a comment immediately above it.",
      expectCount: "Describe must include exactly one expect call.",
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    const checkDescribeCall = (node) => {
      if (!isDescribeCall(node)) {
        return;
      }
      const statement =
        node.parent && node.parent.type === "ExpressionStatement"
          ? node.parent
          : node;
      if (!hasAdjacentComment(statement, sourceCode)) {
        context.report({ node: statement, messageId: "missingComment" });
      }
      const callback = findDescribeCallback(node);
      if (callback) {
        const bodyNode = callback.body || callback;
        const expectCount = countExpectCalls(bodyNode);
        if (expectCount !== 1) {
          context.report({ node: callback, messageId: "expectCount" });
        }
      }
    };

    return {
      CallExpression: checkDescribeCall,
    };
  },
};
