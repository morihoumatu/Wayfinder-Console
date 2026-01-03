/**
 * OpenAI呼び出し処理をまとめる。
 * @file OpenAI呼び出し処理をまとめる。
 */
const https = require("https");

// configからOPENAI_API_KEYとOPENAI_API_URLを取得する。
const { OPENAI_API_KEY, OPENAI_API_URL } = require("./config");

/**
 * OpenAI APIを呼び出す。
 * @param {any} payload リクエストペイロード。
 * @returns {Promise<any>} APIレスポンスのPromise。
 */
function callOpenAI(payload) {
  return new Promise((resolve, reject) => {
    // URLのインスタンスを作成する。
    const url = new URL(OPENAI_API_URL);
    // JSON文字列を生成する。
    const data = JSON.stringify(payload);
    // オプションをまとめる。
    const options = {
      method: "POST",
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    // リクエストを取得する。
    const request = https.request(
      options,
      (/** @type {import("http").IncomingMessage} */ response) => {
        // レスポンス本文を蓄積する。
        let body = "";
        response.on(
          "data",
          (/** @type {Buffer | string} */ chunk) => {
            body += chunk;
          }
        );
        response.on("end", () => {
          // parsedを後で設定するために用意する。
          let parsed;
          // 判定結果の初期値を定義する。
          let shouldResolve = true;
          try {
            parsed = JSON.parse(body);
          } catch (error) {
            reject(new Error("OpenAI response parse error."));
            shouldResolve = false;
          }
          if (shouldResolve && response.statusCode && response.statusCode >= 400) {
            // メッセージを条件で選ぶ。
            const message =
              parsed?.error?.message || "OpenAI API request failed.";
            reject(new Error(message));
            shouldResolve = false;
          }
          if (shouldResolve) {
            resolve(parsed);
          }
        });
      }
    );

    request.on("error", () => {
      reject(new Error("OpenAI API connection failed."));
    });

    request.write(data);
    request.end();
  });
}

module.exports = {
  callOpenAI,
};
