/**
 * docsレポート向けのCSSブロック解析をまとめる。
 * @file docsレポート向けのCSSブロック解析をまとめる。
 */
"use strict";

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
 * 文字の出現回数を数える。
 * @param {string | undefined} line 対象行。
 * @param {string} charToCount 対象文字。
 * @returns {number} 出現回数。
 */
function countChar(line, charToCount) {
  // 件数の初期値を定義する。
  let count = 0;
  if (typeof line === "string" && typeof charToCount === "string") {
    // matchを取得する。
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
  // selectorの初期値を定義する。
  let selector = "";
  if (typeof line === "string") {
    // partsを取得する。
    const parts = line.split("{");
    // headの参照を保持する。
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
  // インデックスの参照を保持する。
  let index = lineIndex;
  // currentを取得する。
  const current = getSelectorText(lines[index] || "");
  if (current.length > 0) {
    parts.unshift(current);
  }
  while (index > 0) {
    // prevLineの参照を保持する。
    const prevLine = lines[index - 1];
    if (typeof prevLine !== "string") {
      break;
    }
    // trimmedを取得する。
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
  // commentの初期値を定義する。
  let comment = "";
  if (typeof line === "string") {
    // インデックスを取得する。
    const openIndex = line.indexOf("/*", startIndex);
    if (openIndex !== -1) {
      // インデックスを取得する。
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
  // lineの参照を保持する。
  const line = lines[lineIndex];
  if (typeof line === "string" && line.includes("{")) {
    // selectorを取得する。
    const selector = collectSelectorLines(lines, lineIndex);
    // commentを取得する。
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
    // matchを取得する。
    const match = line.match(/^\s*([\w-]+|--[\w-]+)\s*:[^;]*;/);
    if (match) {
      // propertyを条件で選ぶ。
      const property = typeof match[1] === "string" ? match[1] : "";
      if (property.length > 0) {
        // インデックスを取得する。
        const semicolonIndex = line.indexOf(";");
        // commentを取得する。
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
  // iをループ用に用意する。
  for (let i = 0; i < stack.length; i += 1) {
    // entryの参照を保持する。
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
  // indexをループ用に用意する。
  for (let index = 0; index < lines.length; index += 1) {
    // lineの参照を保持する。
    const line = lines[index];
    // メッセージを作成する。
    const context = buildContextSelectors(stack);
    // blockEntryを作成する。
    const blockEntry = buildBlockEntry(lines, index, context);
    if (blockEntry) {
      blocks.push(blockEntry);
      stack.push(blockEntry);
    }
    // declarationを解析する。
    const declaration = parseDeclarationLine(line);
    // currentの参照を保持する。
    const current = stack[stack.length - 1];
    if (declaration && current) {
      current.declarations.push(declaration);
    }
    // 件数を取得する。
    const closeCount = countChar(line, "}");
    // closeIndexをループ用に用意する。
    for (let closeIndex = 0; closeIndex < closeCount; closeIndex += 1) {
      stack.pop();
    }
  }
  return blocks;
}

module.exports = {
  parseCssBlocks,
};
