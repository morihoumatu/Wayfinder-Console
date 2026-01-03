/**
 * const/let宣言の直上コメントを必須化するESLintルールを提供する。
 * @file const/let宣言の直上コメントを必須化する。
 */
/* eslint-env node */
"use strict";

// constOrLetかどうかを判定する処理を定義する。
const isConstOrLet = (node) => {
  // 結果の初期値を定義する。
  let result = false;
  if (node && node.type === "VariableDeclaration") {
    result = node.kind === "const" || node.kind === "let";
  }
  return result;
};

// loopDeclarationかどうかを判定する処理を定義する。
const isLoopDeclaration = (node) => {
  // 結果の初期値を定義する。
  let result = false;
  if (node && node.parent) {
    // parentの参照を保持する。
    const parent = node.parent;
    if (parent.type === "ForStatement") {
      result = parent.init === node;
    } else if (parent.type === "ForInStatement") {
      result = parent.left === node;
    } else if (parent.type === "ForOfStatement") {
      result = parent.left === node;
    }
  }
  return result;
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
      description: "Require a comment immediately above const/let declarations.",
    },
    schema: [],
    messages: {
      missingComment: "const/let declaration must have a comment immediately above.",
    },
  },
  create(context) {
    // sourceCodeを取得する。
    const sourceCode = context.getSourceCode();

    // checkVariableDeclarationの処理を定義する。
    const checkVariableDeclaration = (node) => {
      // 判定結果の初期値を定義する。
      let shouldReport = false;
      if (isConstOrLet(node)) {
        if (!isLoopDeclaration(node)) {
          if (!hasAdjacentComment(node, sourceCode)) {
            shouldReport = true;
          }
        }
      }
      if (shouldReport) {
        context.report({ node, messageId: "missingComment" });
      }
    };

    return {
      VariableDeclaration: checkVariableDeclaration,
    };
  },
};
