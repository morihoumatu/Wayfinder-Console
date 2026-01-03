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

/**
 * @typedef {Object} CoverageMetrics
 * @property {number} lines ライン率。
 * @property {number} statements ステートメント率。
 * @property {number} functions 関数率。
 * @property {number} branches 分岐率。
 */

/** @type {CoverageRule} */
const COVERAGE_RULES = {
  lines: 95,
  statements: 95,
  functions: 95,
  branches: 85,
};

/** @type {CoverageRule} */
const FILE_COVERAGE_RULES = {
  lines: 95,
  statements: 95,
  functions: 95,
  branches: 85,
};

/** @type {Array<{ key: keyof CoverageRule, label: string }>} */
const FILE_METRICS = [
  { key: "lines", label: "line" },
  { key: "statements", label: "statement" },
  { key: "functions", label: "function" },
  { key: "branches", label: "branch" },
];

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
 * ファイル別のカバレッジサマリを作成する。
 * @param {any | null} data カバレッジJSON。
 * @returns {Array<{ file: string } & CoverageMetrics>}
 *   集計結果。
 */
function summarizeFileCoverages(data) {
  /** @type {Array<{ file: string } & CoverageMetrics>} */
  let summaries = [];
  if (data) {
    summaries = Object.keys(data)
      .filter((key) => key !== "total")
      .map((key) => {
        const entry = data[key] || {};
        return {
          file: key,
          lines: toNumber(entry.lines?.pct),
          statements: toNumber(entry.statements?.pct),
          functions: toNumber(entry.functions?.pct),
          branches: toNumber(entry.branches?.pct),
        };
      });
  }
  return summaries;
}

/**
 * ファイル別カバレッジの課題を作成する。
 * @param {string} fileLabel ファイル名。
 * @param {string} metricLabel 指標名。
 * @param {number} actual 実績値。
 * @param {number} limit 下限値。
 * @returns {string} 課題メッセージ。
 */
function buildFileCoverageIssue(fileLabel, metricLabel, actual, limit) {
  const actualText = actual.toFixed(2);
  const limitText = limit.toFixed(2);
  const issue = `Coverage (${fileLabel}): ${metricLabel} ${actualText}% が下限 ${limitText}% 未満です`;
  return issue;
}

/**
 * ファイル別カバレッジを評価する。
 * @param {{ file: string } & CoverageMetrics} summary ファイル集計。
 * @param {CoverageRule} rules しきい値。
 * @returns {string[]} 課題一覧。
 */
function evaluateFileCoverage(summary, rules) {
  /** @type {string[]} */
  const issues = [];
  FILE_METRICS.forEach((metric) => {
    const actual = summary[metric.key];
    const limit = rules[metric.key];
    if (typeof actual === "number" && typeof limit === "number") {
      if (actual < limit) {
        issues.push(
          buildFileCoverageIssue(summary.file, metric.label, actual, limit)
        );
      }
    }
  });
  return issues;
}

/**
 * ファイル別カバレッジゲートを評価する。
 * @param {{
 *   summaries: Array<{ file: string } & CoverageMetrics>,
 *   rules: CoverageRule,
 *   reportPath: string
 * }} options 評価オプション。
 * @returns {{ ok: boolean, issues: string[], files: any[] }} 評価結果。
 */
function evaluateFileCoverageGate({ summaries, rules, reportPath }) {
  /** @type {string[]} */
  const issues = [];
  /** @type {any[]} */
  const files = [];
  if (!Array.isArray(summaries) || summaries.length === 0) {
    issues.push(`Coverage: ファイル別レポートが見つかりません (${reportPath})`);
  } else {
    summaries.forEach((summary) => {
      const fileIssues = evaluateFileCoverage(summary, rules);
      const status = fileIssues.length > 0 ? "fail" : "pass";
      files.push({
        file: summary.file,
        lines: summary.lines,
        statements: summary.statements,
        functions: summary.functions,
        branches: summary.branches,
        status,
        issues: fileIssues,
      });
      fileIssues.forEach((issue) => {
        issues.push(issue);
      });
    });
  }
  const ok = issues.length === 0;
  return { ok, issues, files };
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
  FILE_COVERAGE_RULES,
  summarizeCoverage,
  summarizeFileCoverages,
  evaluateCoverage,
  evaluateFileCoverageGate,
};
