/**
 * docsレポート向けにJSDocとファイル情報を解析する。
 * @file docsレポート向けにJSDocとファイル情報を解析する。
 */
"use strict";

// pathモジュールを読み込む。
const path = require("path");

// configからROOT_DIRを取得する。
const { ROOT_DIR } = require("./config");
// utilsからreadTextとnormalizeCommentLineを取得する。
const { readText, normalizeCommentLine } = require("./utils");

/**
 * JSDocに表示すべき内容があるか判定する。
 * @param {any} doc JSDoc情報。
 * @returns {boolean} 表示対象かどうか。
 */
function isDocMeaningful(doc) {
  // 結果の初期値を定義する。
  let result = false;
  if (doc) {
    result =
      doc.description.length > 0 ||
      doc.params.length > 0 ||
      doc.returns.length > 0;
  }
  return result;
}

/**
 * JSDocブロックを分解して構造化する。
 * @param {string} blockText 元のブロック文字列。
 * @returns {any} 解析済みコメント。
 */
function parseJsDocBlock(blockText) {
  // rawLinesを取得する。
  const rawLines = blockText
    .split(/\r?\n/)
    .map(normalizeCommentLine)
    .filter((line) => line.length > 0);
  /** @type {string[]} */
  const descriptionLines = [];
  /** @type {string[]} */
  const params = [];
  /** @type {string[]} */
  const returns = [];
  // tagStartedの初期値を定義する。
  let tagStarted = false;
  /** @type {("param" | "returns" | null)} */
  let currentTag = null;
  /** @type {string[]} */
  let currentTagLines = [];

  /**
   * タグ行を正規化する。
   * @param {string[]} lines タグ行配列。
   * @returns {string} 正規化済みタグ文字列。
   */
  function normalizeTagValue(lines) {
    // normalizedの初期値を定義する。
    let normalized = "";
    if (Array.isArray(lines) && lines.length > 0) {
      normalized = lines.join(" ").replace(/\s+/g, " ").trim();
    }
    return normalized;
  }

  /**
   * 収集中のタグを確定する。
   */
  function flushTag() {
    if (!currentTag) {
      return;
    }
    // valueを正規化する。
    const value = normalizeTagValue(currentTagLines);
    if (value) {
      if (currentTag === "param") {
        params.push(value);
      } else if (currentTag === "returns") {
        returns.push(value);
      }
    }
    currentTag = null;
    currentTagLines = [];
  }

  rawLines.forEach((line) => {
    // paramMatchを取得する。
    const paramMatch = line.match(/^@param\b\s*(.*)$/);
    // returnsMatchを取得する。
    const returnsMatch = line.match(/^@returns?\b\s*(.*)$/);
    if (paramMatch) {
      flushTag();
      tagStarted = true;
      currentTag = "param";
      if (paramMatch[1]) {
        currentTagLines.push(paramMatch[1].trim());
      }
    } else if (returnsMatch) {
      flushTag();
      tagStarted = true;
      currentTag = "returns";
      if (returnsMatch[1]) {
        currentTagLines.push(returnsMatch[1].trim());
      }
    } else if (line.startsWith("@")) {
      flushTag();
      tagStarted = true;
    } else if (currentTag) {
      currentTagLines.push(line);
    } else if (!tagStarted) {
      descriptionLines.push(line);
    }
  });
  flushTag();

  // parsedをまとめる。
  const parsed = {
    description: descriptionLines,
    params,
    returns,
    raw: rawLines,
  };
  return parsed;
}

/**
 * ソースからJSDocブロックを抽出する。
 * @param {string} source ファイル内容。
 * @returns {string[]} 抽出済みブロック。
 */
function extractJsDocBlocks(source) {
  // blocksの一覧を用意する。
  const blocks = [];
  // 正規表現の初期値を定義する。
  const regex = /^\s*\/\*\*([\s\S]*?)\*\//gm;
  // matchを取得する。
  let match = regex.exec(source);
  while (match) {
    if (typeof match[1] === "string") {
      blocks.push(match[1]);
    }
    match = regex.exec(source);
  }
  return blocks;
}

/**
 * ファイル先頭のJSDocブロックを取得する。
 * @param {string} source ファイル内容。
 * @returns {string} 先頭ブロックまたは空文字列。
 */
function getTopJsDocBlock(source) {
  // blockの初期値を定義する。
  let block = "";
  // matchを取得する。
  const match = source.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (match && typeof match[1] === "string") {
    block = match[1];
  }
  return block;
}

/**
 * JSファイルのドキュメント情報を組み立てる。
 * @param {string} filePath ファイルパス。
 * @returns {any} 解析済みファイル情報。
 */
function buildFileDoc(filePath) {
  // contentを読み込む。
  const content = readText(filePath);
  // topBlockを取得する。
  const topBlock = getTopJsDocBlock(content);
  // allBlocksを取得する。
  const allBlocks = extractJsDocBlocks(content);
  // remainingBlocksの参照を保持する。
  let remainingBlocks = allBlocks;
  if (topBlock && allBlocks.length > 0 && allBlocks[0] === topBlock) {
    remainingBlocks = allBlocks.slice(1);
  }

  // topCommentの初期値を定義する。
  let topComment = null;
  if (topBlock) {
    // parsedTopを解析する。
    const parsedTop = parseJsDocBlock(topBlock);
    if (isDocMeaningful(parsedTop)) {
      topComment = parsedTop;
    }
  }

  // docsを取得する。
  const docs = remainingBlocks
    .map(parseJsDocBlock)
    .filter(isDocMeaningful);

  // 結果をまとめる。
  const result = {
    name: path.basename(filePath),
    path: path.relative(ROOT_DIR, filePath),
    topComment,
    docs,
  };
  return result;
}

module.exports = {
  parseJsDocBlock,
  extractJsDocBlocks,
  getTopJsDocBlock,
  buildFileDoc,
};
