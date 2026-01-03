/**
 * カバレッジの集計と判定を行う。
 * @file カバレッジの集計と判定を行う。
 */
/**
 * @typedef {Object} CoverageRule
 * @property {number} lines 最低ライン率。
 * @property {number} statements 最低ステートメント率。
 * @property {number} functions 最低関数率。
 * @property {number} branches 最低分岐率。
 */

/** @type {CoverageRule} */
const COVERAGE_RULES = {
  lines: 85,
  statements: 85,
  functions: 80,
  branches: 70,
};

/**
 * 値を数値に正規化する。
 * @param {unknown} value 入力値。
 * @returns {number} 正規化後の数値。
 */
function toNumber(value) {
  let result = 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    result = value;
  }
  return result;
}

/**
 * Vitestのカバレッジサマリを作成する。
 * @param {any | null} data カバレッジJSON。
 * @returns {{ lines: number, statements: number, functions: number, branches: number } | null}
 *   集計結果またはnull。
 */
function summarizeCoverage(data) {
  /** @type {{ lines: number, statements: number, functions: number, branches: number } | null} */
  let summary = null;
  if (data && data.total) {
    const total = data.total;
    summary = {
      lines: toNumber(total.lines?.pct),
      statements: toNumber(total.statements?.pct),
      functions: toNumber(total.functions?.pct),
      branches: toNumber(total.branches?.pct),
    };
  }
  return summary;
}

/**
 * カバレッジゲートを評価する。
 * @param {{ lines: number, statements: number, functions: number, branches: number } | null} summary
 *   カバレッジ集計。
 * @param {CoverageRule} rules しきい値。
 * @param {string} reportPath レポートパス。
 * @returns {{ ok: boolean, issues: string[] }} 評価結果。
 */
function evaluateCoverage(summary, rules, reportPath) {
  const issues = [];
  if (!summary) {
    issues.push(`Coverage: レポートが見つかりません (${reportPath})`);
  } else {
    if (summary.lines < rules.lines) {
      issues.push(
        `Coverage: line ${summary.lines}% が下限 ${rules.lines}% 未満です`
      );
    }
    if (summary.statements < rules.statements) {
      issues.push(
        `Coverage: statement ${summary.statements}% が下限 ${rules.statements}% 未満です`
      );
    }
    if (summary.functions < rules.functions) {
      issues.push(
        `Coverage: function ${summary.functions}% が下限 ${rules.functions}% 未満です`
      );
    }
    if (summary.branches < rules.branches) {
      issues.push(
        `Coverage: branch ${summary.branches}% が下限 ${rules.branches}% 未満です`
      );
    }
  }
  let ok = true;
  if (issues.length > 0) {
    ok = false;
  }
  return { ok, issues };
}

module.exports = {
  COVERAGE_RULES,
  summarizeCoverage,
  evaluateCoverage,
};
