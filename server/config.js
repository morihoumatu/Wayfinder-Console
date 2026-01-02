const path = require("path");

const PORT = Number.parseInt(process.env["PORT"] || "3000", 10);
const ROOT = path.join(__dirname, "..");
const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];
const OPENAI_API_URL =
  process.env["OPENAI_API_URL"] || "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env["OPENAI_MODEL"] || "gpt-4o-mini";
const WEB_SEARCH_TOOL =
  process.env["OPENAI_WEB_SEARCH_TOOL"] === undefined
    ? "web_search"
    : process.env["OPENAI_WEB_SEARCH_TOOL"];
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
  OPENAI_API_KEY,
  OPENAI_API_URL,
  OPENAI_MODEL,
  WEB_SEARCH_TOOL,
  DEFAULT_WALK_TARGET_MINUTES,
  MIME_TYPES,
};
