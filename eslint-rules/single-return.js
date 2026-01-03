/**
 * ESLintのsingle-returnルールを提供する。
 * @file ESLintのsingle-returnルールを提供する。
 */
/* eslint-env node */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow multiple return statements in a function.",
    },
    schema: [],
    messages: {
      multipleReturns: "Function has multiple return statements.",
    },
  },
  create(context) {
    // functionStackの一覧を用意する。
    const functionStack = [];

    // enterFunctionの処理を定義する。
    const enterFunction = (node) => {
      functionStack.push({ node, returnCount: 0 });
    };

    // exitFunctionの処理を定義する。
    const exitFunction = () => {
      // currentを取得する。
      const current = functionStack.pop();
      if (!current) {
        return;
      }
      if (current.returnCount > 1) {
        context.report({
          node: current.node,
          messageId: "multipleReturns",
        });
      }
    };

    // countReturnの処理を定義する。
    const countReturn = () => {
      // currentの参照を保持する。
      const current = functionStack[functionStack.length - 1];
      if (current) {
        current.returnCount += 1;
      }
    };

    return {
      FunctionDeclaration: enterFunction,
      "FunctionDeclaration:exit": exitFunction,
      FunctionExpression: enterFunction,
      "FunctionExpression:exit": exitFunction,
      ArrowFunctionExpression: enterFunction,
      "ArrowFunctionExpression:exit": exitFunction,
      ReturnStatement: countReturn,
    };
  },
};
