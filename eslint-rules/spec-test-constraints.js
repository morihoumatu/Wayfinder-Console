/**
 * specファイルのテスト記述ルールを検知するESLintルールを提供する。
 * @file specファイルのテスト記述ルールを検知する。
 */
/* eslint-env node */
"use strict";

// Setのインスタンスを作成する。
const TEST_MODIFIERS = new Set(["only", "skip", "fixme", "fail", "slow"]);

// identifierNamedかどうかを判定する処理を定義する。
const isIdentifierNamed = (node, name) => {
  // 結果の初期値を定義する。
  let result = false;
  if (node && node.type === "Identifier") {
    result = node.name === name;
  }
  return result;
};

// testCallかどうかを判定する処理を定義する。
const isTestCall = (node) => {
  // 結果の初期値を定義する。
  let result = false;
  if (node && node.type === "CallExpression") {
    // calleeの参照を保持する。
    const callee = node.callee;
    if (isIdentifierNamed(callee, "test")) {
      result = true;
    } else if (callee && callee.type === "MemberExpression" && !callee.computed) {
      // objectの参照を保持する。
      const object = callee.object;
      // propertyの参照を保持する。
      const property = callee.property;
      if (isIdentifierNamed(object, "test") && property && property.type === "Identifier") {
        result = TEST_MODIFIERS.has(property.name);
      }
    }
  }
  return result;
};

// testCallbackを取得する処理を定義する。
const findTestCallback = (node) => {
  // callbackの初期値を定義する。
  let callback = null;
  if (node && Array.isArray(node.arguments)) {
    // indexをループ用に用意する。
    for (let index = node.arguments.length - 1; index >= 0; index -= 1) {
      // argの参照を保持する。
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

// expectCallかどうかを判定する処理を定義する。
const isExpectCall = (node) => {
  // 結果の初期値を定義する。
  let result = false;
  if (node && node.type === "CallExpression") {
    // calleeの参照を保持する。
    const callee = node.callee;
    if (isIdentifierNamed(callee, "expect")) {
      result = true;
    } else if (callee && callee.type === "MemberExpression" && !callee.computed) {
      // objectの参照を保持する。
      const object = callee.object;
      if (isIdentifierNamed(object, "expect")) {
        result = true;
      }
    }
  }
  return result;
};

// countExpectCallsの処理を定義する。
const countExpectCalls = (node) => {
  // 件数の初期値を定義する。
  let count = 0;
  if (node) {
    // stackの一覧を用意する。
    const stack = [node];
    while (stack.length > 0) {
      // currentを取得する。
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
        // valueの参照を保持する。
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

// adjacentCommentを持つかどうかを判定する処理を定義する。
const hasAdjacentComment = (node, sourceCode) => {
  // 結果の初期値を定義する。
  let result = false;
  if (node && sourceCode && node.loc) {
    // commentsを取得する。
    const comments = sourceCode.getCommentsBefore(node);
    if (comments.length > 0) {
      // lastの参照を保持する。
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
        "Require a comment above each test and exactly one expect call per test.",
    },
    schema: [],
    messages: {
      missingComment: "Test must have a comment immediately above it.",
      expectCount: "Test must include exactly one expect call.",
    },
  },
  create(context) {
    // sourceCodeを取得する。
    const sourceCode = context.getSourceCode();

    // checkTestCallの処理を定義する。
    const checkTestCall = (node) => {
      if (!isTestCall(node)) {
        return;
      }
      // 状態を条件で選ぶ。
      const statement =
        node.parent && node.parent.type === "ExpressionStatement"
          ? node.parent
          : node;
      if (!hasAdjacentComment(statement, sourceCode)) {
        context.report({ node: statement, messageId: "missingComment" });
      }
      // callbackを取得する。
      const callback = findTestCallback(node);
      if (callback) {
        // bodyNodeを条件で選ぶ。
        const bodyNode = callback.body || callback;
        // 件数を取得する。
        const expectCount = countExpectCalls(bodyNode);
        if (expectCount !== 1) {
          context.report({ node: callback, messageId: "expectCount" });
        }
      }
    };

    return {
      CallExpression: checkTestCall,
    };
  },
};
