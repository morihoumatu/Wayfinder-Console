/**
 * HTTPユーティリティをまとめる。
 * @file HTTPユーティリティをまとめる。
 */
const path = require("path");

// CONTENT_SECURITY_POLICYを取得する。
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com",
  "script-src 'self' https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com",
].join("; ");

// SECURITY_HEADERSをまとめる。
const SECURITY_HEADERS = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

/**
 * ベースパスとターゲットを安全に結合する。
 * @param {string} base 基準パス。
 * @param {string} target 対象パス。
 * @returns {string | null} 安全なパスまたはnull。
 */
function safeJoin(base, target) {
  // パスを組み立てる。
  const targetPath = path.normalize(path.join(base, target));
  // resolvedを条件で選ぶ。
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
    ...SECURITY_HEADERS,
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
    // bodyの初期値を定義する。
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
  SECURITY_HEADERS,
};
