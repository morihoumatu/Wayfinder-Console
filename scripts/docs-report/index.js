/**
 * docsレポート生成のエントリポイントをまとめる。
 * @file docsレポート生成のエントリポイントをまとめる。
 */
"use strict";

const fs = require("fs");
const path = require("path");

const { OUTPUT_DIR, OUTPUT_PATH, ROOT_DIR } = require("./config");
const { ensureDirectory } = require("./utils");
const { buildReportData } = require("./tree");
const { renderHtml } = require("./render");

/**
 * ドキュメント生成を実行する。
 */
function main() {
  const reportData = buildReportData();
  ensureDirectory(OUTPUT_DIR);
  const html = renderHtml(reportData);
  fs.writeFileSync(OUTPUT_PATH, html, "utf8");
  const relativePath = path.relative(ROOT_DIR, OUTPUT_PATH);
  process.stdout.write(`Docs written to ${relativePath}\n`);
}

main();
