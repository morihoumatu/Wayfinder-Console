/**
 * docsレポート用のフォルダツリーを構築する。
 * @file docsレポート用のフォルダツリーを構築する。
 */
"use strict";

const fs = require("fs");
const path = require("path");

const {
  ROOT_DIR,
  ROOTS,
  ABOUT_FILENAME,
  JS_EXTENSION,
} = require("./config");
const { readText, readDirectory, shouldIgnoreDir } = require("./utils");
const { buildFileDoc } = require("./parser");

/**
 * ABOUT.mdの先頭見出しを除去して整形する。
 * @param {string} aboutText 元のABOUT内容。
 * @returns {string} 整形後の内容。
 */
function normalizeAboutText(aboutText) {
  let normalized = "";
  if (typeof aboutText === "string" && aboutText.length > 0) {
    const lines = aboutText.split(/\r?\n/);
    let startIndex = skipBlankLines(lines, 0);
    if (isAboutHeaderLine(lines[startIndex])) {
      startIndex = skipBlankLines(lines, startIndex + 1);
    }
    normalized = lines.slice(startIndex).join("\n").trim();
  }
  return normalized;
}

/**
 * 空行をスキップして次の行番号を返す。
 * @param {string[]} lines 行配列。
 * @param {number} startIndex 開始位置。
 * @returns {number} 空行を飛ばした次の行番号。
 */
function skipBlankLines(lines, startIndex) {
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    if (typeof line !== "string" || line.trim().length !== 0) {
      break;
    }
    index += 1;
  }
  return index;
}

/**
 * ABOUT見出しかどうかを判定する。
 * @param {string | undefined} line 行内容。
 * @returns {boolean} ABOUT見出しかどうか。
 */
function isAboutHeaderLine(line) {
  let result = false;
  if (typeof line === "string") {
    result = /^#\s*ABOUT\b/i.test(line.trim());
  }
  return result;
}

/**
 * 描画用のディレクトリノードを作成する。
 * @param {string} dirPath ディレクトリパス。
 * @returns {any | null} ディレクトリノード。
 */
function buildDirNode(dirPath) {
  let node = null;
  if (fs.existsSync(dirPath)) {
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
      const entries = readDirectory(dirPath);
      /** @type {any[]} */
      const files = [];
      /** @type {any[]} */
      const subdirs = [];

      entries.forEach((entry) => {
        if (entry.isDirectory()) {
          if (!shouldIgnoreDir(entry.name)) {
            const child = buildDirNode(path.join(dirPath, entry.name));
            if (child) {
              subdirs.push(child);
            }
          }
        } else if (entry.isFile() && entry.name.endsWith(JS_EXTENSION)) {
          files.push(buildFileDoc(path.join(dirPath, entry.name)));
        }
      });

      files.sort((a, b) => a.name.localeCompare(b.name));
      subdirs.sort((a, b) => a.name.localeCompare(b.name));

      const aboutPath = path.join(dirPath, ABOUT_FILENAME);
      let about = "";
      if (fs.existsSync(aboutPath)) {
        about = normalizeAboutText(readText(aboutPath));
      }

      node = {
        name: path.basename(dirPath),
        path: path.relative(ROOT_DIR, dirPath),
        about,
        files,
        subdirs,
      };
    }
  }
  return node;
}

/**
 * 描画用のレポートデータを作成する。
 * @returns {any} レポートデータ。
 */
function buildReportData() {
  /** @type {any[]} */
  const roots = [];
  ROOTS.forEach((rootName) => {
    const rootPath = path.join(ROOT_DIR, rootName);
    const node = buildDirNode(rootPath);
    if (node) {
      roots.push(node);
    }
  });
  const reportData = {
    generatedAt: new Date().toISOString(),
    roots,
  };
  return reportData;
}

module.exports = {
  buildDirNode,
  buildReportData,
};
