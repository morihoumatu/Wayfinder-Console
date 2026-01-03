/**
 * 動的検証ツールを一括実行する。
 * @file 動的検証ツールを一括実行する。
 */
const { spawn } = require("child_process");
const http = require("http");

const SERVER_URL = "http://localhost:3000";
const SERVER_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 300;

/**
 * npmコマンド名を解決する。
 * @returns {string} npmコマンド名。
 */
function resolveNpmCommand() {
  return "npm";
}

/**
 * 実行コマンドをWindows向けに調整する。
 * @param {string} command コマンド。
 * @param {string[]} args 引数。
 * @returns {{ command: string, args: string[], windowsHide: boolean }} 実行情報。
 */
function buildSpawnSpec(command, args) {
  let resolvedCommand = command;
  let resolvedArgs = args;
  let windowsHide = false;

  if (process.platform === "win32") {
    resolvedCommand = "cmd.exe";
    resolvedArgs = ["/c", command, ...args];
    windowsHide = true;
  }

  return {
    command: resolvedCommand,
    args: resolvedArgs,
    windowsHide,
  };
}

/**
 * コマンドを実行して終了コードを返す。
 * @param {string} label 実行名。
 * @param {string} command コマンド。
 * @param {string[]} args 引数。
 * @returns {Promise<number>} 終了コード。
 */
function runCommand(label, command, args) {
  let exitCode = 1;
  return new Promise((resolve) => {
    process.stdout.write(`[test-all] ${label}\n`);
    const spawnSpec = buildSpawnSpec(command, args);
    const child = spawn(spawnSpec.command, spawnSpec.args, {
      stdio: "inherit",
      env: process.env,
      windowsHide: spawnSpec.windowsHide,
    });
    child.on("exit", (code) => {
      if (typeof code === "number") {
        exitCode = code;
      }
      resolve(exitCode);
    });
    child.on("error", () => {
      resolve(exitCode);
    });
  });
}

/**
 * 前の結果が成功なら次のステップを実行する。
 * @param {number} currentCode 現在の終了コード。
 * @param {() => Promise<number>} step 実行ステップ。
 * @returns {Promise<number>} 更新後の終了コード。
 */
async function runStepIfOk(currentCode, step) {
  let nextCode = currentCode;
  if (currentCode === 0) {
    const stepCode = await step();
    if (stepCode !== 0) {
      nextCode = stepCode;
    }
  }
  return nextCode;
}

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
  const child = spawn(process.execPath, ["server.js"], {
    stdio: "inherit",
    env: process.env,
  });
  return child;
}

/**
 * Cypress用サーバーの起動状態を準備する。
 * @param {string} urlString 対象URL。
 * @returns {Promise<{ child: import("child_process").ChildProcess | null, started: boolean }>} 起動結果。
 */
async function ensureServer(urlString) {
  let child = null;
  let started = false;
  const alreadyReady = await checkServer(urlString);
  if (!alreadyReady) {
    child = startServer();
    const ready = await waitForServer(urlString, SERVER_TIMEOUT_MS);
    if (!ready) {
      if (child) {
        child.kill();
      }
      throw new Error("Cypress用のサーバー起動に失敗しました。");
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

/**
 * Cypressを実行する。
 * @param {string} npmCommand npmコマンド。
 * @returns {Promise<number>} 終了コード。
 */
async function runCypress(npmCommand) {
  let exitCode = 1;
  let serverChild = null;
  let serverStarted = false;

  try {
    const serverResult = await ensureServer(SERVER_URL);
    serverChild = serverResult.child;
    serverStarted = serverResult.started;
    exitCode = await runCommand(
      "cypress",
      npmCommand,
      ["run", "test:cypress"]
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    process.stderr.write(`[test-all] ${message}\n`);
    exitCode = 1;
  } finally {
    stopServer(serverChild, serverStarted);
  }

  return exitCode;
}

/**
 * レポートと品質ゲートを実行する。
 * @param {string} npmCommand npmコマンド。
 * @param {number} currentCode 現在の終了コード。
 * @returns {Promise<number>} 更新後の終了コード。
 */
async function runReportAndGate(npmCommand, currentCode) {
  let nextCode = currentCode;
  const gateCode = await runCommand(
    "gate",
    npmCommand,
    ["run", "test:gate"]
  );
  if (nextCode === 0 && gateCode !== 0) {
    nextCode = gateCode;
  }
  const reportCode = await runCommand(
    "report",
    npmCommand,
    ["run", "test:report"]
  );
  if (nextCode === 0 && reportCode !== 0) {
    nextCode = reportCode;
  }
  return nextCode;
}

/**
 * 動的検証ツールを順番に実行する。
 * @returns {Promise<number>} 終了コード。
 */
async function runAll() {
  const npmCommand = resolveNpmCommand();
  let exitCode = 0;

  try {
    exitCode = await runStepIfOk(exitCode, () =>
      runCommand("vitest", npmCommand, ["run", "test:vitest"])
    );
    exitCode = await runStepIfOk(exitCode, () =>
      runCommand("playwright", npmCommand, ["run", "test:playwright"])
    );
    exitCode = await runStepIfOk(exitCode, () => runCypress(npmCommand));
  } catch (error) {
    exitCode = 1;
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    process.stderr.write(`[test-all] ${message}\n`);
  } finally {
    exitCode = await runReportAndGate(npmCommand, exitCode);
  }

  return exitCode;
}

runAll()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    process.stderr.write(`[test-all] ${message}\n`);
    process.exitCode = 1;
  });
