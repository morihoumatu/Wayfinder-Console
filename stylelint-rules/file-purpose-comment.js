/**
 * CSSファイルの用途コメントを検知するStylelintルールを提供する。
 * @file CSSファイルの用途コメントを検知するStylelintルールを提供する。
 */
/* eslint-env node */
"use strict";

const stylelint = require("stylelint");

const RULE_NAME = "project/file-purpose-comment";
const messages = stylelint.utils.ruleMessages(RULE_NAME, {
  missing: "CSSファイルの先頭に用途コメントを記述してください。",
  empty: "CSSファイルの先頭コメントに用途を記述してください。",
});

/**
 * BOMを除去する。
 * @param {string} value 対象文字列。
 * @returns {string} BOM除去済み文字列。
 */
function stripBom(value) {
  let text = value;
  if (typeof text === "string" && text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text;
}

/**
 * 最初の非空白位置を取得する。
 * @param {string} value 対象文字列。
 * @returns {number} インデックス。
 */
function findFirstNonWhitespace(value) {
  let index = -1;
  if (typeof value === "string") {
    index = value.search(/\S/);
  }
  return index;
}

/**
 * 先頭コメントを取得する。
 * @param {string} value 対象文字列。
 * @param {number} startIndex 開始位置。
 * @returns {{ content: string, endIndex: number } | null} コメント情報。
 */
function extractLeadingComment(value, startIndex) {
  let info = null;
  if (value.startsWith("/*", startIndex)) {
    const endIndex = value.indexOf("*/", startIndex + 2);
    if (endIndex !== -1) {
      const content = value.slice(startIndex + 2, endIndex).trim();
      info = { content, endIndex };
    }
  }
  return info;
}

/**
 * 用途コメントの状態を取得する。
 * @param {string} text CSS文字列。
 * @returns {"ok" | "missing" | "empty"} 判定結果。
 */
function evaluatePurposeComment(text) {
  let status = "ok";
  const firstIndex = findFirstNonWhitespace(text);
  if (firstIndex === -1) {
    status = "missing";
  } else {
    const commentInfo = extractLeadingComment(text, firstIndex);
    if (!commentInfo) {
      status = "missing";
    } else if (commentInfo.content.length === 0) {
      status = "empty";
    }
  }
  return status;
}

/**
 * ルール本体を生成する。
 * @param {any} primaryOption ルール設定値。
 * @returns {(root: any, result: any) => void} 実行関数。
 */
function createRule(primaryOption) {
  return (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, RULE_NAME, {
      actual: primaryOption,
      possible: [true],
      optional: true,
    });

    if (validOptions && primaryOption !== null) {
      const rawText =
        root && root.source && root.source.input
          ? root.source.input.css
          : "";
      const text = stripBom(rawText);
      const status = evaluatePurposeComment(text);
      if (status === "missing") {
        stylelint.utils.report({
          ruleName: RULE_NAME,
          result,
          node: root,
          message: messages.missing,
        });
      } else if (status === "empty") {
        stylelint.utils.report({
          ruleName: RULE_NAME,
          result,
          node: root,
          message: messages.empty,
        });
      }
    }
  };
}

module.exports = stylelint.createPlugin(RULE_NAME, createRule);
module.exports.ruleName = RULE_NAME;
module.exports.messages = messages;
