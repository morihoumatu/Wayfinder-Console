/**
 * const/let宣言の直上コメントを必須化するESLintルールを提供する。
 * @file const/let宣言の直上コメントを必須化する。
 */
/* eslint-env node */
"use strict";

const isConstOrLet = (node) => {
  let result = false;
  if (node && node.type === "VariableDeclaration") {
    result = node.kind === "const" || node.kind === "let";
  }
  return result;
};

const isLoopDeclaration = (node) => {
  let result = false;
  if (!node || !node.parent) {
    return result;
  }
  const parent = node.parent;
  if (parent.type === "ForStatement") {
    result = parent.init === node;
  } else if (parent.type === "ForInStatement") {
    result = parent.left === node;
  } else if (parent.type === "ForOfStatement") {
    result = parent.left === node;
  }
  return result;
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
      description: "Require a comment immediately above const/let declarations.",
    },
    schema: [],
    messages: {
      missingComment: "const/let declaration must have a comment immediately above.",
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    const checkVariableDeclaration = (node) => {
      if (!isConstOrLet(node)) {
        return;
      }
      if (isLoopDeclaration(node)) {
        return;
      }
      if (!hasAdjacentComment(node, sourceCode)) {
        context.report({ node, messageId: "missingComment" });
      }
    };

    return {
      VariableDeclaration: checkVariableDeclaration,
    };
  },
};
