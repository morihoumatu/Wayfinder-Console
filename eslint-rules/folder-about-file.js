/**
 * フォルダ説明ファイルの有無を検知するESLintルールを提供する。
 * @file フォルダ説明ファイルの有無を検知する。
 */
/* eslint-env node */
"use strict";

// fsモジュールを読み込む。
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");

// DEFAULT_ROOTSの一覧を用意する。
const DEFAULT_ROOTS = ["app", "server", "scripts"];
// ABOUT_FILENAMEの定数を定義する。
const ABOUT_FILENAME = "ABOUT.md";
// Setのインスタンスを作成する。
const IGNORE_DIRS = new Set(["node_modules", ".git", "reports"]);

// キャッシュの初期値を定義する。
let cachedCwd = null;
// キャッシュの初期値を定義する。
let cachedMissing = null;
// reportedOnceの初期値を定義する。
let reportedOnce = false;

// ignoreDirできるか判定する処理を定義する。
const shouldIgnoreDir = (dirName) => {
  return dirName.startsWith(".") || IGNORE_DIRS.has(dirName);
};

// directoryを読み取る処理を定義する。
const readDirectory = (dirPath) => {
  // entriesの一覧を用意する。
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    entries = [];
  }
  return entries;
};

// directoriesを収集する処理を定義する。
const collectDirectories = (rootPath) => {
  // collectedの一覧を用意する。
  const collected = [];
  // stackの一覧を用意する。
  const stack = [rootPath];

  while (stack.length > 0) {
    // currentを取得する。
    const current = stack.pop();
    if (!current) {
      continue;
    }
    collected.push(current);
    // entriesを読み込む。
    const entries = readDirectory(current);
    entries.forEach((entry) => {
      if (entry.isDirectory() && !shouldIgnoreDir(entry.name)) {
        stack.push(path.join(current, entry.name));
      }
    });
  }
  return collected;
};

// missingAboutFilesを解決する処理を定義する。
const resolveMissingAboutFiles = (cwd) => {
  /** @type {string[]} */
  const missing = [];

  DEFAULT_ROOTS.forEach((rootName) => {
    // パスを組み立てる。
    const rootPath = path.join(cwd, rootName);
    if (fs.existsSync(rootPath)) {
      // statを取得する。
      const stat = fs.statSync(rootPath);
      if (stat.isDirectory()) {
        // dirsを取得する。
        const dirs = collectDirectories(rootPath);
        dirs.forEach((dirPath) => {
          // パスを組み立てる。
          const aboutPath = path.join(dirPath, ABOUT_FILENAME);
          if (!fs.existsSync(aboutPath)) {
            missing.push(path.relative(cwd, dirPath));
          }
        });
      }
    }
  });

  return missing;
};

// missingDirectoriesを取得する処理を定義する。
const getMissingDirectories = (cwd) => {
  if (cachedCwd !== cwd) {
    cachedCwd = cwd;
    cachedMissing = null;
    reportedOnce = false;
  }
  if (!cachedMissing) {
    cachedMissing = resolveMissingAboutFiles(cwd);
  }
  return cachedMissing;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require ABOUT.md in every directory under app/, server/, and scripts/.",
    },
    schema: [],
    messages: {
      missing: "Directory \"{{dir}}\" is missing ABOUT.md.",
    },
  },
  create(context) {
    // cwdを条件で選ぶ。
    const cwd =
      typeof context.getCwd === "function" ? context.getCwd() : process.cwd();

    // reportMissingの処理を定義する。
    const reportMissing = (node) => {
      if (reportedOnce) {
        return;
      }
      // missingを取得する。
      const missing = getMissingDirectories(cwd);
      missing.forEach((dir) => {
        context.report({
          node,
          messageId: "missing",
          data: { dir },
        });
      });
      reportedOnce = true;
    };

    return {
      Program: reportMissing,
    };
  },
};
