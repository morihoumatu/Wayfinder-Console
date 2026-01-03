/**
 * Cypress実行時の環境を整える。
 * @file Cypress実行時の環境を整える。
 */
const { spawn } = require("child_process");
const path = require("path");

/**
 * Cypressの実行ファイルパスを取得する。
 * @returns {string} 実行ファイルパス。
 */
function getCypressBin() {
  const binName = process.platform === "win32" ? "cypress.cmd" : "cypress";
  return path.join(__dirname, "..", "node_modules", ".bin", binName);
}

/**
 * Cypress CLIを実行する。
 * @returns {Promise<number>} 終了コード。
 */
function runCypress() {
  const args = process.argv.slice(2);
  const defaultCommand = "run";
  const explicitCommand = args[0];
  const command =
    explicitCommand === "run" || explicitCommand === "open"
      ? explicitCommand
      : defaultCommand;
  const commandArgs = [
    command,
    ...(command === explicitCommand ? args.slice(1) : args),
  ];
  const env = { ...process.env };
  delete env["ELECTRON_RUN_AS_NODE"];

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
