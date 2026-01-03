/**
 * 品質ゲート向けの集計をまとめる。
 * @file 品質ゲート向けの集計をまとめる。
 */
// fsモジュールを読み込む。
const fs = require("fs");
// summary-buildersから集計関数を取得する。
const {
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
  summarizeLighthouse,
  summarizeLoadTest,
  summarizeSecurity,
} = require("./summary-builders");

/**
 * ファイルパスからJSONを読み取る。
 * @param {string} filePath ファイルパス。
 * @returns {any | null} 解析結果またはnull。
 */
function readJson(filePath) {
  // 結果の初期値を定義する。
  let result = null;
  if (fs.existsSync(filePath)) {
    try {
      // ファイル内容を読み取る。
      const content = fs.readFileSync(filePath, "utf8");
      result = JSON.parse(content);
    } catch (error) {
      result = null;
    }
  }
  return result;
}

/**
 * 品質ゲートを評価する。
 * @param {any} summary 集計結果。
 * @param {any} rule ゲート条件。
 * @param {string} reportPath レポートパス。
 * @returns {{ ok: boolean, issues: string[] }} 評価結果。
 */
function evaluateGate(summary, rule, reportPath) {
  // 判定結果の一覧を用意する。
  const issues = [];
  if (summary.status === "missing") {
    issues.push(`${summary.name}: レポートが見つかりません (${reportPath})`);
  }
  if (summary.failed > rule.maxFailed) {
    issues.push(
      `${summary.name}: 失敗数 ${summary.failed} が上限 ${rule.maxFailed} を超えています`
    );
  }
  if (summary.skipped > rule.maxSkipped) {
    issues.push(
      `${summary.name}: スキップ数 ${summary.skipped} が上限 ${rule.maxSkipped} を超えています`
    );
  }
  if (summary.total < rule.minTotal) {
    issues.push(
      `${summary.name}: テスト数 ${summary.total} が下限 ${rule.minTotal} 未満です`
    );
  }
  // okの初期値を定義する。
  let ok = true;
  if (issues.length > 0) {
    ok = false;
  }
  return { ok, issues };
}

module.exports = {
  readJson,
  summarizeVitest,
  summarizePlaywright,
  summarizeCypress,
  summarizeLighthouse,
  summarizeLoadTest,
  summarizeSecurity,
  evaluateGate,
};
