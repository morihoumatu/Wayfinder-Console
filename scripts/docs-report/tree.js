/**
 * docsレポート用のフォルダツリーを構築する。
 * @file docsレポート用のフォルダツリーを構築する。
 */
"use strict";

// fsモジュールを読み込む。
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");

// configから必要な値を取得する。
const {
  ROOT_DIR,
  ROOTS,
  ABOUT_FILENAME,
  JS_EXTENSION,
  CSS_EXTENSION,
  CSS_ROOTS,
  CSS_FILES,
} = require("./config");
// utilsからreadTextとreadDirectoryとshouldIgnoreDirを取得する。
const { readText, readDirectory, shouldIgnoreDir } = require("./utils");
// parserからbuildFileDocを取得する。
const { buildFileDoc } = require("./parser");
// css-parserからbuildCssFileDocを取得する。
const { buildCssFileDoc } = require("./css-parser");

/**
 * ABOUT.mdの先頭見出しを除去して整形する。
 * @param {string} aboutText 元のABOUT内容。
 * @returns {string} 整形後の内容。
 */
function normalizeAboutText(aboutText) {
  // normalizedの初期値を定義する。
  let normalized = "";
  if (typeof aboutText === "string" && aboutText.length > 0) {
    // linesを取得する。
    const lines = aboutText.split(/\r?\n/);
    // インデックスを取得する。
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
  // インデックスの参照を保持する。
  let index = startIndex;
  while (index < lines.length) {
    // lineの参照を保持する。
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
  // 結果の初期値を定義する。
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
  // nodeの初期値を定義する。
  let node = null;
  if (fs.existsSync(dirPath)) {
    // statを取得する。
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
      // entriesを読み込む。
      const entries = readDirectory(dirPath);
      /** @type {any[]} */
      const files = [];
      /** @type {any[]} */
      const subdirs = [];

      entries.forEach((entry) => {
        if (entry.isDirectory()) {
          if (!shouldIgnoreDir(entry.name)) {
            // childを作成する。
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

      // パスを組み立てる。
      const aboutPath = path.join(dirPath, ABOUT_FILENAME);
      // aboutの初期値を定義する。
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
 * CSSファイルを再帰的に収集する。
 * @param {string} dirPath ディレクトリパス。
 * @param {any[]} files 収集先配列。
 */
function collectCssFilesFromDir(dirPath, files) {
  // entriesを読み込む。
  const entries = readDirectory(dirPath);
  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      if (!shouldIgnoreDir(entry.name)) {
        collectCssFilesFromDir(path.join(dirPath, entry.name), files);
      }
    } else if (entry.isFile() && entry.name.endsWith(CSS_EXTENSION)) {
      files.push(buildCssFileDoc(path.join(dirPath, entry.name)));
    }
  });
}

/**
 * CSSルート配下のファイルを収集する。
 * @param {string[]} roots ルート配列。
 * @param {any[]} files 収集先配列。
 */
function collectCssFilesFromRoots(roots, files) {
  roots.forEach((rootName) => {
    // パスを組み立てる。
    const rootPath = path.join(ROOT_DIR, rootName);
    if (fs.existsSync(rootPath)) {
      // statを取得する。
      const stat = fs.statSync(rootPath);
      if (stat.isDirectory()) {
        collectCssFilesFromDir(rootPath, files);
      }
    }
  });
}

/**
 * 直指定CSSファイルを収集する。
 * @param {string[]} fileNames ファイル名配列。
 * @param {any[]} files 収集先配列。
 */
function collectCssFilesFromList(fileNames, files) {
  fileNames.forEach((fileName) => {
    // パスを組み立てる。
    const filePath = path.join(ROOT_DIR, fileName);
    if (fs.existsSync(filePath)) {
      // statを取得する。
      const stat = fs.statSync(filePath);
      if (stat.isFile() && filePath.endsWith(CSS_EXTENSION)) {
        files.push(buildCssFileDoc(filePath));
      }
    }
  });
}

/**
 * CSSファイルの一覧を構築する。
 * @returns {any[]} CSSファイル情報。
 */
function buildCssFileList() {
  /** @type {any[]} */
  const files = [];
  collectCssFilesFromList(CSS_FILES, files);
  collectCssFilesFromRoots(CSS_ROOTS, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

/**
 * 描画用のレポートデータを作成する。
 * @returns {any} レポートデータ。
 */
function buildReportData() {
  /** @type {any[]} */
  const roots = [];
  // cssFilesを作成する。
  const cssFiles = buildCssFileList();
  ROOTS.forEach((rootName) => {
    // パスを組み立てる。
    const rootPath = path.join(ROOT_DIR, rootName);
    // nodeを作成する。
    const node = buildDirNode(rootPath);
    if (node) {
      roots.push(node);
    }
  });
  // データをまとめる。
  const reportData = {
    generatedAt: new Date().toISOString(),
    roots,
    cssFiles,
  };
  return reportData;
}

module.exports = {
  buildDirNode,
  buildReportData,
};
