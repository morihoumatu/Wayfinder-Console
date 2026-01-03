/**
 * docsレポート生成の設定値をまとめる。
 * @file docsレポート生成の設定値をまとめる。
 */
"use strict";

// pathモジュールを読み込む。
const path = require("path");

// ROOT_DIRを取得する。
const ROOT_DIR = process.cwd();
// パスを組み立てる。
const OUTPUT_DIR = path.join(ROOT_DIR, "reports");
// パスを組み立てる。
const OUTPUT_PATH = path.join(OUTPUT_DIR, "docs-report.html");
// ROOTSの一覧を用意する。
const ROOTS = ["app", "server", "scripts"];
// ABOUT_FILENAMEの定数を定義する。
const ABOUT_FILENAME = "ABOUT.md";
// JS_EXTENSIONの定数を定義する。
const JS_EXTENSION = ".js";
// CSS_EXTENSIONの定数を定義する。
const CSS_EXTENSION = ".css";
// CSS_ROOTSの一覧を用意する。
const CSS_ROOTS = ["styles"];
// CSS_FILESの一覧を用意する。
const CSS_FILES = ["styles.css"];
// Setのインスタンスを作成する。
const IGNORE_DIRS = new Set(["node_modules", ".git", "reports"]);

module.exports = {
  ROOT_DIR,
  OUTPUT_DIR,
  OUTPUT_PATH,
  ROOTS,
  ABOUT_FILENAME,
  JS_EXTENSION,
  CSS_EXTENSION,
  CSS_ROOTS,
  CSS_FILES,
  IGNORE_DIRS,
};
