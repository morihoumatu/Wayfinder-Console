/**
 * docsレポート向けのCSS解析補助をまとめる。
 * @file docsレポート向けのCSS解析補助をまとめる。
 */
"use strict";

/**
 * BOMを除去する。
 * @param {string} value 対象文字列。
 * @returns {string} BOM除去済み文字列。
 */
function stripBom(value) {
  // メッセージの参照を保持する。
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
  // インデックスを用意する。
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
  // infoの初期値を定義する。
  let info = null;
  if (value.startsWith("/*", startIndex)) {
    // インデックスを取得する。
    const endIndex = value.indexOf("*/", startIndex + 2);
    if (endIndex !== -1) {
      // contentを取得する。
      const content = value.slice(startIndex + 2, endIndex).trim();
      info = { content, endIndex };
    }
  }
  return info;
}
/**
 * CSSファイル先頭の用途コメントを抽出する。
 * @param {string} content ファイル内容。
 * @returns {string} 用途コメント。
 */
function extractPurposeComment(content) {
  // purposeの初期値を定義する。
  let purpose = "";
  // メッセージを取得する。
  const text = stripBom(content);
  // インデックスを取得する。
  const firstIndex = findFirstNonWhitespace(text);
  if (firstIndex !== -1) {
    // commentInfoを取得する。
    const commentInfo = extractLeadingComment(text, firstIndex);
    if (commentInfo && commentInfo.content.length > 0) {
      purpose = commentInfo.content;
    }
  }
  return purpose;
}
/**
 * CSSを行配列に分割する。
 * @param {string} content ファイル内容。
 * @returns {string[]} 行配列。
 */
function splitLines(content) {
  /** @type {string[]} */
  let lines = [];
  if (typeof content === "string") {
    lines = content.split(/\r?\n/);
  }
  return lines;
}

module.exports = {
  extractPurposeComment,
  splitLines,
};
