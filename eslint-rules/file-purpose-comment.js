/**
 * ファイル用途コメントを検知するESLintルールを提供する。
 * @file
 */
/* eslint-env node */
"use strict";

const FILE_TAG_REGEX = /^@file(?:overview)?\b/i;

const normalizeCommentLine = (line) => {
  return line.replace(/^\s*\*?/, "").trim();
};

const getCommentLines = (comment) => {
  return comment.value
    .split(/\r?\n/)
    .map(normalizeCommentLine)
    .filter((line) => line.length > 0);
};

const hasFileTag = (lines) => {
  return lines.some((line) => FILE_TAG_REGEX.test(line));
};

const hasDescription = (lines) => {
  return lines.some((line) => line.length > 0 && !line.startsWith("@"));
};

const isPurposeComment = (comment) => {
  const lines = getCommentLines(comment);
  return hasFileTag(lines) && hasDescription(lines);
};

const isEdgeComment = (comment, firstToken, lastToken) => {
  let result = true;
  if (firstToken && lastToken) {
    const endsBeforeFirst = comment.range[1] <= firstToken.range[0];
    const startsAfterLast = comment.range[0] >= lastToken.range[1];
    result = endsBeforeFirst || startsAfterLast;
  }
  return result;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a file purpose comment at the top or bottom of the file.",
    },
    schema: [],
    messages: {
      missing:
        "File must include a purpose comment at the top or bottom with @file or @fileoverview.",
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    const checkProgram = (node) => {
      const comments = sourceCode.getAllComments();
      const firstToken = sourceCode.getFirstToken(node);
      const lastToken = sourceCode.getLastToken(node);
      const hasPurpose = comments.some(
        (comment) =>
          isPurposeComment(comment) &&
          isEdgeComment(comment, firstToken, lastToken)
      );

      if (!hasPurpose) {
        context.report({ node, messageId: "missing" });
      }
    };

    return {
      Program: checkProgram,
    };
  },
};
