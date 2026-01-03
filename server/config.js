/**
 * サーバー設定値を定義する。
 * @file サーバー設定値を定義する。
 */
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");

// localEnvを取得する処理を定義する。
const loadLocalEnv = () => {
  // パスを組み立てる。
  const envPath = path.join(__dirname, "..", ".env");
  // 判定結果を条件で選ぶ。
  const shouldLoad =
    process.env["NODE_ENV"] !== "production" && fs.existsSync(envPath);
  if (shouldLoad) {
    // ファイル内容を読み取る。
    const content = fs.readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      // trimmedを取得する。
      const trimmed = line.trim();
      // 判定結果を条件で選ぶ。
      const isComment = !trimmed || trimmed.startsWith("#");
      // インデックスを取得する。
      const separatorIndex = trimmed.indexOf("=");
      if (!isComment && separatorIndex >= 0) {
        // キーを取得する。
        const key = trimmed.slice(0, separatorIndex).trim();
        // valueを取得する。
        let value = trimmed.slice(separatorIndex + 1).trim();
        // セットを条件で選ぶ。
        const shouldSet = key && process.env[key] === undefined;
        if (shouldSet) {
          // 判定結果を条件で選ぶ。
          const isWrapped =
            (value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"));
          if (isWrapped) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
};

loadLocalEnv();

// PORTを解析する。
const PORT = Number.parseInt(process.env["PORT"] || "3000", 10);
// パスを組み立てる。
const ROOT = path.join(__dirname, "..");
// マップを条件で選ぶ。
const MAPS_API_KEY =
  process.env["GOOGLE_MAPS_API_KEY"] || process.env["MAPS_API_KEY"];
// キーの参照を保持する。
const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];
// URLを条件で選ぶ。
const OPENAI_API_URL =
  process.env["OPENAI_API_URL"] || "https://api.openai.com/v1/responses";
// OPENAI_MODELを条件で選ぶ。
const OPENAI_MODEL = process.env["OPENAI_MODEL"] || "gpt-4o-mini";
// WEB_SEARCH_TOOLを条件で選ぶ。
const WEB_SEARCH_TOOL =
  process.env["OPENAI_WEB_SEARCH_TOOL"] === undefined
    ? "web_search"
    : process.env["OPENAI_WEB_SEARCH_TOOL"];
// DEFAULT_WALK_TARGET_MINUTESの定数を定義する。
const DEFAULT_WALK_TARGET_MINUTES = 60;

/** @type {Record<string, string>} */
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

module.exports = {
  PORT,
  ROOT,
  MAPS_API_KEY,
  OPENAI_API_KEY,
  OPENAI_API_URL,
  OPENAI_MODEL,
  WEB_SEARCH_TOOL,
  DEFAULT_WALK_TARGET_MINUTES,
  MIME_TYPES,
};
