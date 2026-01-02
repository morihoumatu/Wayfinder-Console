/**
 * docsレポート生成の共通ヘルパーをまとめる。
 * @file docsレポート生成の共通ヘルパーをまとめる。
 */
"use strict";

const fs = require("fs");

const { IGNORE_DIRS } = require("./config");

/**
 * 出力ディレクトリの存在を保証する。
 * @param {string} dirPath ディレクトリパス。
 * @returns {boolean} 存在確認結果。
 */
function ensureDirectory(dirPath) {
  const ensured = true;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return ensured;
}

/**
 * UTF-8ファイルを安全に読み込む。
 * @param {string} filePath ファイルパス。
 * @returns {string} 読み込み内容または空文字列。
 */
function readText(filePath) {
  let text = "";
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    text = "";
  }
  return text;
}

/**
 * HTML特殊文字をエスケープする。
 * @param {any} value 入力値。
 * @returns {string} エスケープ後のHTML文字列。
 */
function escapeHtml(value) {
  const text = String(value);
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return escaped;
}

/**
 * JSDocの1行を正規化する。
 * @param {string} line 元の行。
 * @returns {string} 正規化済みの行。
 */
function normalizeCommentLine(line) {
  const normalized = line.replace(/^\s*\*?/, "").trim();
  return normalized;
}

/**
 * ディレクトリを除外対象にするか判定する。
 * @param {string} dirName ディレクトリ名。
 * @returns {boolean} 除外するかどうか。
 */
function shouldIgnoreDir(dirName) {
  const ignored = dirName.startsWith(".") || IGNORE_DIRS.has(dirName);
  return ignored;
}

/**
 * ディレクトリのエントリを安全に読み込む。
 * @param {string} dirPath ディレクトリパス。
 * @returns {import("fs").Dirent[]} ディレクトリエントリ。
 */
function readDirectory(dirPath) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    entries = [];
  }
  return entries;
}

module.exports = {
  ensureDirectory,
  readText,
  escapeHtml,
  normalizeCommentLine,
  shouldIgnoreDir,
  readDirectory,
};
