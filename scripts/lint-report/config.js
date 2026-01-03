/**
 * lintレポートの設定値を定義する。
 * @file lintレポートの設定値を定義する。
 */
const path = require("path");

// ROOT_DIRを取得する。
const ROOT_DIR = process.cwd();
// パスを組み立てる。
const REPORT_DIR = path.join(ROOT_DIR, "reports");
// パスを組み立てる。
const REPORT_PATH = path.join(REPORT_DIR, "lint-report.html");
// パスを組み立てる。
const BIN_DIR = path.join(ROOT_DIR, "node_modules", ".bin");
// BIN_EXTを条件で選ぶ。
const BIN_EXT = process.platform === "win32" ? ".cmd" : "";

// BASE_ENVをまとめる。
const BASE_ENV = {
  ...process.env,
  FORCE_COLOR: "0",
  NO_COLOR: "1",
};

// TSC_REGEX_PARENの定数を定義する。
const TSC_REGEX_PAREN =
  /^(.*)\((\d+),(\d+)\): (error|warning) TS(\d+): (.*)$/;
// TSC_REGEX_COLONの定数を定義する。
const TSC_REGEX_COLON =
  /^(.*):(\d+):(\d+) - (error|warning) TS(\d+): (.*)$/;
// TSC_REGEX_GLOBALの定数を定義する。
const TSC_REGEX_GLOBAL = /^(error|warning) TS(\d+): (.*)$/;

module.exports = {
  ROOT_DIR,
  REPORT_DIR,
  REPORT_PATH,
  BIN_DIR,
  BIN_EXT,
  BASE_ENV,
  TSC_REGEX_PAREN,
  TSC_REGEX_COLON,
  TSC_REGEX_GLOBAL,
};
