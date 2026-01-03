/**
 * docsレポート向けにCSSファイルの情報を解析する。
 * @file docsレポート向けにCSSファイルの情報を解析する。
 */
"use strict";
const path = require("path");
const { ROOT_DIR } = require("./config");
const { readText } = require("./utils");
/**
 * CSS内の宣言情報。
 * @typedef {Object} CssDeclaration
 * @property {string} property プロパティ名。
 * @property {string} comment コメント内容。
 */
/**
 * CSS内のブロック情報。
 * @typedef {Object} CssBlock
 * @property {string} selector セレクタ。
 * @property {string} comment ブロックコメント。
 * @property {string[]} context 親コンテキスト。
 * @property {CssDeclaration[]} declarations 宣言一覧。
 */
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
 * CSSファイル先頭の用途コメントを抽出する。
 * @param {string} content ファイル内容。
 * @returns {string} 用途コメント。
 */
function extractPurposeComment(content) {
  let purpose = "";
  const text = stripBom(content);
  const firstIndex = findFirstNonWhitespace(text);
  if (firstIndex !== -1) {
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
/**
 * 文字の出現回数を数える。
 * @param {string | undefined} line 対象行。
 * @param {string} charToCount 対象文字。
 * @returns {number} 出現回数。
 */
function countChar(line, charToCount) {
  let count = 0;
  if (typeof line === "string" && typeof charToCount === "string") {
    const match = line.match(new RegExp(`\\${charToCount}`, "g"));
    if (match) {
      count = match.length;
    }
  }
  return count;
}
/**
 * 行からセレクタ部分を取得する。
 * @param {string | undefined} line 対象行。
 * @returns {string} セレクタ文字列。
 */
function getSelectorText(line) {
  let selector = "";
  if (typeof line === "string") {
    const parts = line.split("{");
    const head = parts[0];
    if (typeof head === "string") {
      selector = head.trim();
    }
  }
  return selector;
}
/**
 * 複数行セレクタを結合する。
 * @param {string[]} lines 行配列。
 * @param {number} lineIndex 対象行番号。
 * @returns {string} 結合済みセレクタ。
 */
function collectSelectorLines(lines, lineIndex) {
  /** @type {string[]} */
  const parts = [];
  let index = lineIndex;
  const current = getSelectorText(lines[index] || "");
  if (current.length > 0) {
    parts.unshift(current);
  }
  while (index > 0) {
    const prevLine = lines[index - 1];
    if (typeof prevLine !== "string") {
      break;
    }
    const trimmed = prevLine.trim();
    if (trimmed.length === 0) {
      break;
    }
    if (trimmed.includes("{") || trimmed.includes("}")) {
      break;
    }
    if (!trimmed.endsWith(",")) {
      break;
    }
    parts.unshift(trimmed);
    index -= 1;
  }
  return parts.join(" ");
}
/**
 * 指定位置以降のインラインコメントを抽出する。
 * @param {string | undefined} line 対象行。
 * @param {number} startIndex 検索開始位置。
 * @returns {string} コメント文字列。
 */
function extractInlineComment(line, startIndex) {
  let comment = "";
  if (typeof line === "string") {
    const openIndex = line.indexOf("/*", startIndex);
    if (openIndex !== -1) {
      const closeIndex = line.indexOf("*/", openIndex + 2);
      if (closeIndex !== -1) {
        comment = line.slice(openIndex + 2, closeIndex).trim();
      }
    }
  }
  return comment;
}
/**
 * ブロック情報を生成する。
 * @param {string[]} lines 行配列。
 * @param {number} lineIndex 行番号。
 * @param {string[]} context 親コンテキスト。
 * @returns {CssBlock | null} ブロック情報。
 */
function buildBlockEntry(lines, lineIndex, context) {
  /** @type {CssBlock | null} */
  let block = null;
  const line = lines[lineIndex];
  if (typeof line === "string" && line.includes("{")) {
    const selector = collectSelectorLines(lines, lineIndex);
    const comment = extractInlineComment(line, line.indexOf("{") + 1);
    block = {
      selector,
      comment,
      context,
      declarations: [],
    };
  }
  return block;
}
/**
 * 宣言行から情報を抽出する。
 * @param {string | undefined} line 対象行。
 * @returns {CssDeclaration | null} 宣言情報。
 */
function parseDeclarationLine(line) {
  /** @type {CssDeclaration | null} */
  let declaration = null;
  if (typeof line === "string") {
    const match = line.match(/^\s*([\w-]+|--[\w-]+)\s*:[^;]*;/);
    if (match) {
      const property = typeof match[1] === "string" ? match[1] : "";
      if (property.length > 0) {
        const semicolonIndex = line.indexOf(";");
        const comment = extractInlineComment(line, semicolonIndex + 1);
        declaration = { property, comment };
      }
    }
  }
  return declaration;
}
/**
 * コンテキストセレクタ配列を作成する。
 * @param {CssBlock[]} stack ブロックスタック。
 * @returns {string[]} セレクタ配列。
 */
function buildContextSelectors(stack) {
  /** @type {string[]} */
  const selectors = [];
  for (let i = 0; i < stack.length; i += 1) {
    const entry = stack[i];
    if (entry) {
      selectors.push(entry.selector);
    }
  }
  return selectors;
}
/**
 * CSS内のブロック情報を解析する。
 * @param {string[]} lines 行配列。
 * @returns {CssBlock[]} ブロック情報。
 */
function parseCssBlocks(lines) {
  /** @type {CssBlock[]} */
  const blocks = [];
  /** @type {CssBlock[]} */
  const stack = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const context = buildContextSelectors(stack);
    const blockEntry = buildBlockEntry(lines, index, context);
    if (blockEntry) {
      blocks.push(blockEntry);
      stack.push(blockEntry);
    }
    const declaration = parseDeclarationLine(line);
    const current = stack[stack.length - 1];
    if (declaration && current) {
      current.declarations.push(declaration);
    }
    const closeCount = countChar(line, "}");
    for (let closeIndex = 0; closeIndex < closeCount; closeIndex += 1) {
      stack.pop();
    }
  }
  return blocks;
}
/**
 * CSSファイルのドキュメント情報を組み立てる。
 * @param {string} filePath ファイルパス。
 * @returns {any} 解析済みファイル情報。
 */
function buildCssFileDoc(filePath) {
  const content = readText(filePath);
  const lines = splitLines(content);
  const purposeComment = extractPurposeComment(content);
  const blocks = parseCssBlocks(lines);
  const result = {
    name: path.basename(filePath),
    path: path.relative(ROOT_DIR, filePath),
    purposeComment,
    blocks,
  };
  return result;
}
module.exports = {
  buildCssFileDoc,
  extractPurposeComment,
  parseCssBlocks,
};
