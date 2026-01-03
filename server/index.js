/**
 * サーバー本体の起動処理をまとめる。
 * @file サーバー本体の起動処理をまとめる。
 */
const http = require("http");
// fsモジュールを読み込む。
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");
// zlibモジュールを読み込む。
const zlib = require("zlib");

// configから必要な値を取得する。
const { PORT, ROOT, MAPS_API_KEY, OPENAI_API_KEY, MIME_TYPES } = require("./config");
// http-utilsから必要な値を取得する。
const {
  safeJoin,
  sendJson,
  readJson,
  SECURITY_HEADERS,
} = require("./http-utils");
// handlersからhandleRecommendPayloadを取得する。
const { handleRecommendPayload } = require("./handlers");

// COMPRESSIBLE_TYPESをまとめる。
const COMPRESSIBLE_TYPES = new Set([
  "text/html",
  "text/css",
  "application/javascript",
  "application/json",
  "image/svg+xml",
]);

/**
 * MIMEタイプからcharsetなどを除去する。
 * @param {string} contentType MIMEタイプ。
 * @returns {string} ベースのMIMEタイプ。
 */
const stripCharset = (contentType) => {
  // baseTypeを取得する。
  const baseType = contentType.split(";")[0];
  return (baseType || "").trim();
};

/**
 * Cache-Controlを作成する。
 * @param {string} ext 拡張子。
 * @returns {string} Cache-Controlヘッダー。
 */
const buildCacheControl = (ext) =>
  ext === ".html"
    ? "no-cache"
    : "public, max-age=31536000, immutable";

/**
 * 圧縮対象かどうかを判定する。
 * @param {import("http").IncomingMessage} req リクエスト。
 * @param {string} contentType Content-Type。
 * @returns {boolean} 圧縮する場合true。
 */
const shouldCompress = (req, contentType) => {
  // acceptEncodingを取得する。
  const acceptEncoding = req.headers["accept-encoding"] || "";
  // 判定結果の初期値を定義する。
  let compress = false;
  // canGzipを取得する。
  const canGzip = /\bgzip\b/i.test(acceptEncoding);
  // baseTypeを取得する。
  const baseType = stripCharset(contentType);
  if (canGzip) {
    compress = COMPRESSIBLE_TYPES.has(baseType);
  }
  return compress;
};

/**
 * 設定情報のAPIレスポンスを返す。
 * @param {any} req リクエスト。
 * @param {any} res レスポンス。
 */
const handleConfigRequest = (req, res) => {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
  } else {
    sendJson(res, 200, { mapsApiKey: MAPS_API_KEY || "" });
  }
};

/**
 * おすすめAPIのリクエストを処理する。
 * @param {any} req リクエスト。
 * @param {any} res レスポンス。
 */
const handleRecommendRequest = (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, SECURITY_HEADERS);
    res.end();
  } else if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
  } else if (!OPENAI_API_KEY) {
    sendJson(res, 500, { error: "OPENAI_API_KEY が設定されていません。" });
  } else {
    readJson(req)
      .then(async (payload) => {
        // レスポンスの初期値を定義する。
        let responseSent = false;
        // sendOnceの処理を定義する。
        const sendOnce = (
          /** @type {number} */ status,
          /** @type {any} */ responseBody
        ) => {
          if (!responseSent) {
            responseSent = true;
            sendJson(res, status, responseBody);
          }
        };
        await handleRecommendPayload(payload, sendOnce);
      })
      .catch((error) => {
        sendJson(res, 500, {
          error: error.message || "おすすめ地点の取得に失敗しました。",
        });
      });
  }
};

/**
 * 静的ファイルリクエストを処理する。
 * @param {import("http").IncomingMessage} req リクエスト。
 * @param {any} res レスポンス。
 * @param {string} requestPath リクエストパス。
 */
const handleStaticRequest = (req, res, requestPath) => {
  // パスを条件で選ぶ。
  const relativePath = requestPath === "/" ? "/index.html" : requestPath;
  // パスを取得する。
  const filePath = safeJoin(ROOT, relativePath);

  if (!filePath) {
    res.writeHead(403, {
      "Content-Type": "text/plain; charset=utf-8",
      ...SECURITY_HEADERS,
    });
    res.end("Forbidden");
  } else {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // 状態を条件で選ぶ。
        const status = err.code === "ENOENT" ? 404 : 500;
        res.writeHead(status, {
          "Content-Type": "text/plain; charset=utf-8",
          ...SECURITY_HEADERS,
        });
        res.end(status === 404 ? "Not Found" : "Server Error");
      } else {
        // extを整形する。
        const ext = path.extname(filePath).toLowerCase();
        // contentTypeを取得する。
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        // cacheControlを取得する。
        const cacheControl = buildCacheControl(ext);
        // headersを取得する。
        const headers = {
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
          ...SECURITY_HEADERS,
        };
        if (shouldCompress(req, contentType)) {
          zlib.gzip(data, (zipError, compressed) => {
            if (zipError) {
              res.writeHead(200, headers);
              res.end(data);
              return;
            }
            res.writeHead(200, {
              ...headers,
              "Content-Encoding": "gzip",
              Vary: "Accept-Encoding",
            });
            res.end(compressed);
          });
          return;
        }
        res.writeHead(200, headers);
        res.end(data);
      }
    });
  }
};

// serverを作成する。
const server = http.createServer((req, res) => {
  // リクエストを条件で選ぶ。
  const requestUrl = req.url || "/";
  // リクエストを取得する。
  const requestPath = decodeURIComponent(requestUrl.split("?")[0] || "/");
  if (requestPath === "/api/config") {
    handleConfigRequest(req, res);
  } else if (requestPath === "/api/recommend") {
    handleRecommendRequest(req, res);
  } else {
    handleStaticRequest(req, res, requestPath);
  }
});

// startServerの処理を定義する。
const startServer = () => {
  server.listen(PORT, () => {
    process.stdout.write(`Server running at http://localhost:${PORT}\n`);
  });
};

module.exports = {
  startServer,
};
