/**
 * lintレポート集計処理をまとめる。
 * @file lintレポート集計処理をまとめる。
 */
/**
 * 実行コマンド文字列を組み立てる。
 * @param {string} command コマンド名。
 * @param {string[]} args 引数配列。
 * @returns {string} 表示用コマンド。
 */
function formatCommand(command, args) {
  return [command].concat(args).join(" ");
}

/**
 * ツール単位のレポートを作成する。
 * @param {string} name ツール名。
 * @param {any} result 実行結果。
 * @param {(result: any) => any} parser 解析関数。
 * @returns {any} ツールレポート。
 */
function buildToolReport(name, result, parser) {
  const parsed = parser(result);
  const status =
    parsed.toolError || parsed.errors > 0 || parsed.warnings > 0
      ? "fail"
      : "ok";
  return {
    name,
    command: formatCommand(result.command, result.args),
    status,
    errors: parsed.errors,
    warnings: parsed.warnings,
    files: parsed.files,
    toolError: parsed.toolError,
    rawOutput: parsed.rawOutput,
  };
}

module.exports = {
  formatCommand,
  buildToolReport,
};
