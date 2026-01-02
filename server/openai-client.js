const https = require("https");

const { OPENAI_API_KEY, OPENAI_API_URL } = require("./config");

/**
 * OpenAI APIを呼び出す。
 * @param {any} payload リクエストペイロード。
 * @returns {Promise<any>} APIレスポンスのPromise。
 */
function callOpenAI(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(OPENAI_API_URL);
    const data = JSON.stringify(payload);
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

    const request = https.request(
      options,
      (/** @type {import("http").IncomingMessage} */ response) => {
        let body = "";
        response.on(
          "data",
          (/** @type {Buffer | string} */ chunk) => {
            body += chunk;
          }
        );
        response.on("end", () => {
          let parsed;
          let shouldResolve = true;
          try {
            parsed = JSON.parse(body);
          } catch (error) {
            reject(new Error("OpenAI response parse error."));
            shouldResolve = false;
          }
          if (shouldResolve && response.statusCode && response.statusCode >= 400) {
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
