/**
 * サーバー本体の起動処理をまとめる。
 * @file サーバー本体の起動処理をまとめる。
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const { PORT, ROOT, OPENAI_API_KEY, MIME_TYPES } = require("./config");
const {
  safeJoin,
  sendJson,
  readJson,
  SECURITY_HEADERS,
} = require("./http-utils");
const { handleRecommendPayload } = require("./handlers");

const server = http.createServer((req, res) => {
  const requestUrl = req.url || "/";
  const requestPath = decodeURIComponent(requestUrl.split("?")[0] || "/");
  if (requestPath === "/api/recommend") {
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
  } else {
    const relativePath = requestPath === "/" ? "/index.html" : requestPath;
    const filePath = safeJoin(ROOT, relativePath);

    if (!filePath) {
      res.writeHead(403, {
        "Content-Type": "text/plain; charset=utf-8",
        ...SECURITY_HEADERS,
      });
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        const status = err.code === "ENOENT" ? 404 : 500;
        res.writeHead(status, {
          "Content-Type": "text/plain; charset=utf-8",
          ...SECURITY_HEADERS,
        });
        res.end(status === 404 ? "Not Found" : "Server Error");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        ...SECURITY_HEADERS,
      });
      res.end(data);
    });
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
