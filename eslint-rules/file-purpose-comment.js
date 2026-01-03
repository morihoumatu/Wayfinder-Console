/**
 * ファイル用途コメントを検知するESLintルールを提供する。
 * @file
 */
/* eslint-env node */
"use strict";

// FILE_TAG_REGEXの定数を定義する。
const FILE_TAG_REGEX = /^@file(?:overview)?\b/i;

// commentLineを正規化する処理を定義する。
const normalizeCommentLine = (line) => {
  return line.replace(/^\s*\*?/, "").trim();
};

// commentLinesを取得する処理を定義する。
const getCommentLines = (comment) => {
  return comment.value
    .split(/\r?\n/)
    .map(normalizeCommentLine)
    .filter((line) => line.length > 0);
};

// fileTagを持つかどうかを判定する処理を定義する。
const hasFileTag = (lines) => {
  return lines.some((line) => FILE_TAG_REGEX.test(line));
};

// descriptionを持つかどうかを判定する処理を定義する。
const hasDescription = (lines) => {
  return lines.some((line) => line.length > 0 && !line.startsWith("@"));
};

// purposeCommentかどうかを判定する処理を定義する。
const isPurposeComment = (comment) => {
  // linesを取得する。
  const lines = getCommentLines(comment);
  return hasFileTag(lines) && hasDescription(lines);
};

// edgeCommentかどうかを判定する処理を定義する。
const isEdgeComment = (comment, firstToken, lastToken) => {
  // 結果の初期値を定義する。
  let result = true;
  if (firstToken && lastToken) {
    // endsBeforeFirstを用意する。
    const endsBeforeFirst = comment.range[1] <= firstToken.range[0];
    // startsAfterLastを用意する。
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
    // sourceCodeを取得する。
    const sourceCode = context.getSourceCode();

    // checkProgramの処理を定義する。
    const checkProgram = (node) => {
      // commentsを取得する。
      const comments = sourceCode.getAllComments();
      // firstTokenを取得する。
      const firstToken = sourceCode.getFirstToken(node);
      // lastTokenを取得する。
      const lastToken = sourceCode.getLastToken(node);
      // 判定結果を取得する。
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
