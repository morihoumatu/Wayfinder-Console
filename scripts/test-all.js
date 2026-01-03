/**
 * 動的検証ツールを一括実行する。
 * @file 動的検証ツールを一括実行する。
 */
const { spawn } = require("child_process");
const { ensureServer, stopServer } = require("./test-server");

const SERVER_URL = "http://localhost:3000";
const SERVER_TIMEOUT_MS = 30_000;

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
 * Cypressを実行する。
 * @param {string} npmCommand npmコマンド。
 * @returns {Promise<number>} 終了コード。
 */
async function runCypress(npmCommand) {
  let exitCode = 1;
  let serverChild = null;
  let serverStarted = false;

  try {
    const serverResult = await ensureServer(SERVER_URL, SERVER_TIMEOUT_MS);
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
    exitCode = await runStepIfOk(exitCode, () =>
      runCommand("lighthouse", npmCommand, ["run", "test:perf"])
    );
    exitCode = await runStepIfOk(exitCode, () =>
      runCommand("load", npmCommand, ["run", "test:load"])
    );
    exitCode = await runStepIfOk(exitCode, () =>
      runCommand("security", npmCommand, ["run", "test:security"])
    );
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
