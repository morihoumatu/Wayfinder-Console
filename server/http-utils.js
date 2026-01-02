/**
 * HTTPユーティリティをまとめる。
 * @file HTTPユーティリティをまとめる。
 */
const path = require("path");

/**
 * ベースパスとターゲットを安全に結合する。
 * @param {string} base 基準パス。
 * @param {string} target 対象パス。
 * @returns {string | null} 安全なパスまたはnull。
 */
function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  const resolved = targetPath.startsWith(base) ? targetPath : null;
  return resolved;
}

/**
 * JSONレスポンスを送信する。
 * @param {import("http").ServerResponse} res レスポンスオブジェクト。
 * @param {number} status HTTPステータス。
 * @param {unknown} payload レスポンス本文。
 */
function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

/**
 * リクエスト本文のJSONを読み取る。
 * @param {import("http").IncomingMessage} req リクエスト。
 * @returns {Promise<any>} 解析結果のPromise。
 */
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on(
      "data",
      (/** @type {Buffer | string} */ chunk) => {
        body += chunk;
        if (body.length > 1_000_000) {
          reject(new Error("Request body too large."));
          req.destroy();
        }
      }
    );
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON."));
      }
    });
  });
}

module.exports = {
  safeJoin,
  sendJson,
  readJson,
};
