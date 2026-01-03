/**
 * サーバー本体の起動処理をまとめる。
 * @file サーバー本体の起動処理をまとめる。
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const { PORT, ROOT, MAPS_API_KEY, OPENAI_API_KEY, MIME_TYPES } = require("./config");
const {
  safeJoin,
  sendJson,
  readJson,
  SECURITY_HEADERS,
} = require("./http-utils");
const { handleRecommendPayload } = require("./handlers");

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
        let responseSent = false;
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
 * @param {any} res レスポンス。
 * @param {string} requestPath リクエストパス。
 */
const handleStaticRequest = (res, requestPath) => {
  const relativePath = requestPath === "/" ? "/index.html" : requestPath;
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
        const status = err.code === "ENOENT" ? 404 : 500;
        res.writeHead(status, {
          "Content-Type": "text/plain; charset=utf-8",
          ...SECURITY_HEADERS,
        });
        res.end(status === 404 ? "Not Found" : "Server Error");
      } else {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
          ...SECURITY_HEADERS,
        });
        res.end(data);
      }
    });
  }
};

const server = http.createServer((req, res) => {
  const requestUrl = req.url || "/";
  const requestPath = decodeURIComponent(requestUrl.split("?")[0] || "/");
  if (requestPath === "/api/config") {
    handleConfigRequest(req, res);
  } else if (requestPath === "/api/recommend") {
    handleRecommendRequest(req, res);
  } else {
    handleStaticRequest(res, requestPath);
  }
});

const startServer = () => {
  server.listen(PORT, () => {
    process.stdout.write(`Server running at http://localhost:${PORT}\n`);
  });
};

module.exports = {
  startServer,
};
