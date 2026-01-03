/**
 * docsレポート向けにCSSファイルの情報を解析する。
 * @file docsレポート向けにCSSファイルの情報を解析する。
 */
"use strict";
// pathモジュールを読み込む。
const path = require("path");
// configからROOT_DIRを取得する。
const { ROOT_DIR } = require("./config");
// utilsからreadTextを取得する。
const { readText } = require("./utils");
// css-parser-utilsから解析関数を取得する。
const { extractPurposeComment, splitLines } = require("./css-parser-utils");
// css-block-parserからCSSブロック解析関数を取得する。
const { parseCssBlocks } = require("./css-block-parser");

/**
 * CSSファイルのドキュメント情報を組み立てる。
 * @param {string} filePath ファイルパス。
 * @returns {any} 解析済みファイル情報。
 */
function buildCssFileDoc(filePath) {
  // contentを読み込む。
  const content = readText(filePath);
  // linesを取得する。
  const lines = splitLines(content);
  // purposeCommentを取得する。
  const purposeComment = extractPurposeComment(content);
  // blocksを解析する。
  const blocks = parseCssBlocks(lines);
  // 結果をまとめる。
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
