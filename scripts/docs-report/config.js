/**
 * docsレポート生成の設定値をまとめる。
 * @file docsレポート生成の設定値をまとめる。
 */
"use strict";

const path = require("path");

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, "reports");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "docs-report.html");
const ROOTS = ["app", "server", "scripts"];
const ABOUT_FILENAME = "ABOUT.md";
const JS_EXTENSION = ".js";
const IGNORE_DIRS = new Set(["node_modules", ".git", "reports"]);

module.exports = {
  ROOT_DIR,
  OUTPUT_DIR,
  OUTPUT_PATH,
  ROOTS,
  ABOUT_FILENAME,
  JS_EXTENSION,
  IGNORE_DIRS,
};
