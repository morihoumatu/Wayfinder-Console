/**
 * docsレポート生成のエントリポイントをまとめる。
 * @file docsレポート生成のエントリポイントをまとめる。
 */
"use strict";

// fsモジュールを読み込む。
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");

// configからOUTPUT_DIRとOUTPUT_PATHとROOT_DIRを取得する。
const { OUTPUT_DIR, OUTPUT_PATH, ROOT_DIR } = require("./config");
// utilsからensureDirectoryを取得する。
const { ensureDirectory } = require("./utils");
// treeからbuildReportDataを取得する。
const { buildReportData } = require("./tree");
// renderからrenderHtmlを取得する。
const { renderHtml } = require("./render");

/**
 * ドキュメント生成を実行する。
 */
function main() {
  // データを作成する。
  const reportData = buildReportData();
  ensureDirectory(OUTPUT_DIR);
  // htmlを取得する。
  const html = renderHtml(reportData);
  fs.writeFileSync(OUTPUT_PATH, html, "utf8");
  // パス情報を取得する。
  const relativePath = path.relative(ROOT_DIR, OUTPUT_PATH);
  process.stdout.write(`Docs written to ${relativePath}\n`);
}

main();
