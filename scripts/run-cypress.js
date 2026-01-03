/**
 * Cypress実行時の環境を整える。
 * @file Cypress実行時の環境を整える。
 */
const { spawn } = require("child_process");
// pathモジュールを読み込む。
const path = require("path");

/**
 * Cypressの実行ファイルパスを取得する。
 * @returns {string} 実行ファイルパス。
 */
function getCypressBin() {
  // binNameを条件で選ぶ。
  const binName = process.platform === "win32" ? "cypress.cmd" : "cypress";
  return path.join(__dirname, "..", "node_modules", ".bin", binName);
}

/**
 * Cypress CLIを実行する。
 * @returns {Promise<number>} 終了コード。
 */
function runCypress() {
  // argsを取得する。
  const args = process.argv.slice(2);
  // defaultCommandの初期値を定義する。
  const defaultCommand = "run";
  // explicitCommandの参照を保持する。
  const explicitCommand = args[0];
  // commandを条件で選ぶ。
  const command =
    explicitCommand === "run" || explicitCommand === "open"
      ? explicitCommand
      : defaultCommand;
  // commandArgsの一覧を用意する。
  const commandArgs = [
    command,
    ...(command === explicitCommand ? args.slice(1) : args),
  ];
  // envをまとめる。
  const env = { ...process.env };
  delete env["ELECTRON_RUN_AS_NODE"];

  // childを取得する。
  const child = spawn(getCypressBin(), commandArgs, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
    windowsHide: process.platform === "win32",
  });

  return new Promise((resolve) => {
    child.on("exit", (code) => {
      resolve(typeof code === "number" ? code : 1);
    });
    child.on("error", () => {
      resolve(1);
    });
  });
}

runCypress()
  .then((code) => {
    process.exitCode = code;
  })
  .catch(() => {
    process.exitCode = 1;
  });
