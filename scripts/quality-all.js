/**
 * 静的解析と動的検証を並列実行する。
 * @file 静的解析と動的検証を並列実行する。
 */
const { spawn } = require("child_process");

const TASKS = [
  { label: "lint", args: ["run", "lint"] },
  { label: "test", args: ["run", "test:all"] },
];

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
 * 出力をラベル付きで中継する。
 * @param {import("stream").Readable} stream 出力ストリーム。
 * @param {string} prefix 行頭ラベル。
 * @param {NodeJS.WriteStream} target 書き込み先。
 */
function pipeOutput(stream, prefix, target) {
  let buffer = "";
  let isBrokenPipe = false;
  /**
   * パイプ切断エラーを無視する。
   * @param {unknown} error エラー。
   */
  const handleTargetError = (error) => {
    const maybeError =
      error && typeof error === "object" && "code" in error
        ? error
        : null;
    if (maybeError && maybeError.code === "EPIPE") {
      isBrokenPipe = true;
    }
  };
  target.on("error", handleTargetError);
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.forEach((line) => {
      if (!isBrokenPipe && target.writable && !target.destroyed) {
        try {
          target.write(`${prefix} ${line}\n`);
        } catch (error) {
          handleTargetError(error);
        }
      }
    });
  });
  stream.on("end", () => {
    if (buffer) {
      if (!isBrokenPipe && target.writable && !target.destroyed) {
        try {
          target.write(`${prefix} ${buffer}\n`);
        } catch (error) {
          handleTargetError(error);
        }
      }
    }
  });
}

/**
 * コマンドを実行して終了コードを返す。
 * @param {{ label: string, args: string[] }} task 実行タスク。
 * @param {string} npmCommand npmコマンド。
 * @returns {Promise<number>} 終了コード。
 */
function runTask(task, npmCommand) {
  let exitCode = 1;
  return new Promise((resolve) => {
    const spawnSpec = buildSpawnSpec(npmCommand, task.args);
    const child = spawn(spawnSpec.command, spawnSpec.args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      windowsHide: spawnSpec.windowsHide,
    });
    pipeOutput(child.stdout, `[${task.label}]`, process.stdout);
    pipeOutput(child.stderr, `[${task.label}]`, process.stderr);
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
 * 静的解析と動的検証を並列実行する。
 * @returns {Promise<void>} 実行完了のPromise。
 */
async function runAll() {
  const npmCommand = resolveNpmCommand();
  const results = await Promise.all(
    TASKS.map((task) => runTask(task, npmCommand))
  );
  const hasFailure = results.some((code) => code !== 0);
  process.exitCode = hasFailure ? 1 : 0;
}

runAll().catch(() => {
  process.exitCode = 1;
});
