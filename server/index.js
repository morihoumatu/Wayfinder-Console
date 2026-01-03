/**
 * サーバー本体の起動処理をまとめる。
 * @file サーバー本体の起動処理をまとめる。
 */
const http = require("http");
// fsモジュールを読み込む。
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");

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
 * @param {any} res レスポンス。
 * @param {string} requestPath リクエストパス。
 */
const handleStaticRequest = (res, requestPath) => {
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
        res.writeHead(200, {
          "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
          ...SECURITY_HEADERS,
        });
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
    handleStaticRequest(res, requestPath);
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
