const path = require("path");

const ROOT_DIR = process.cwd();
const REPORT_DIR = path.join(ROOT_DIR, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "lint-report.html");
const BIN_DIR = path.join(ROOT_DIR, "node_modules", ".bin");
const BIN_EXT = process.platform === "win32" ? ".cmd" : "";

const BASE_ENV = {
  ...process.env,
  FORCE_COLOR: "0",
  NO_COLOR: "1",
};

const TSC_REGEX_PAREN =
  /^(.*)\((\d+),(\d+)\): (error|warning) TS(\d+): (.*)$/;
const TSC_REGEX_COLON =
  /^(.*):(\d+):(\d+) - (error|warning) TS(\d+): (.*)$/;
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
