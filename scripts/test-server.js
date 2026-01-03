/**
 * テスト用のサーバー制御をまとめる。
 * @file テスト用のサーバー制御をまとめる。
 */
const http = require("http");
const { spawn } = require("child_process");

const DEFAULT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 300;

/**
 * サーバーが応答するか確認する。
 * @param {string} urlString 対象URL。
 * @returns {Promise<boolean>} 応答可否。
 */
function checkServer(urlString) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (/** @type {boolean} */ value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const request = http.get(urlString, (res) => {
      const status = res.statusCode || 0;
      const ok = status >= 200 && status < 500;
      res.resume();
      finish(ok);
    });
    request.setTimeout(1000, () => {
      request.destroy();
      finish(false);
    });
    request.on("error", () => {
      finish(false);
    });
  });
}

/**
 * サーバーが起動するまで待機する。
 * @param {string} urlString 対象URL。
 * @param {number} timeoutMs 待機上限。
 * @returns {Promise<boolean>} 起動可否。
 */
function waitForServer(urlString, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const startedAt = Date.now();
    const finish = (/** @type {boolean} */ value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const poll = () => {
      checkServer(urlString).then((ready) => {
        if (ready) {
          finish(true);
        } else if (Date.now() - startedAt >= timeoutMs) {
          finish(false);
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      });
    };
    poll();
  });
}

/**
 * Nodeサーバーを起動する。
 * @returns {import("child_process").ChildProcess} 起動プロセス。
 */
function startServer() {
  return spawn(process.execPath, ["server.js"], {
    stdio: "inherit",
    env: process.env,
  });
}

/**
 * サーバーの起動状態を準備する。
 * @param {string} urlString 対象URL。
 * @param {number} [timeoutMs] 待機上限。
 * @returns {Promise<{ child: import("child_process").ChildProcess | null, started: boolean }>}
 *   起動結果。
 */
async function ensureServer(urlString, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let child = null;
  let started = false;
  const alreadyReady = await checkServer(urlString);
  if (!alreadyReady) {
    child = startServer();
    const ready = await waitForServer(urlString, timeoutMs);
    if (!ready) {
      if (child) {
        child.kill();
      }
      throw new Error("テスト用のサーバー起動に失敗しました。");
    }
    started = true;
  }
  return { child, started };
}

/**
 * サーバーを終了する。
 * @param {import("child_process").ChildProcess | null} child プロセス。
 * @param {boolean} started 自前起動かどうか。
 */
function stopServer(child, started) {
  if (child && started) {
    child.kill();
  }
}

module.exports = {
  ensureServer,
  stopServer,
};
