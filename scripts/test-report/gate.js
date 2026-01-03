/**
 * 品質ゲートのHTML描画をまとめる。
 * @file 品質ゲートのHTML描画をまとめる。
 */
// utilsからescapeHtmlを取得する。
const { escapeHtml } = require("./utils");
// gate-utilsから補助関数を取得する。
const {
  formatPercent,
  resolveGateStatusLabel,
  resolveGateStatusClass,
  renderGateIssues,
} = require("./gate-utils");

/**
 * ツール別ゲート行を描画する。
 * @param {any[]} tools ツール配列。
 * @returns {string} HTML文字列。
 */
function renderToolRows(tools) {
  // rowsの初期値を定義する。
  let rows = "";
  if (Array.isArray(tools)) {
    rows = tools
      .map((tool) => {
        // 状態を条件で選ぶ。
        const toolStatus =
          tool.status === "pass"
            ? "pass"
            : tool.status === "fail"
              ? "fail"
              : "missing";
        // ruleを条件で選ぶ。
        const rule = tool.rule || {
          minTotal: 0,
          maxFailed: 0,
          maxSkipped: 0,
        };
        return `
          <tr class="${toolStatus}">
            <td>${escapeHtml(tool.name)}</td>
            <td class="status">${toolStatus.toUpperCase()}</td>
            <td>${tool.total}</td>
            <td>${rule.minTotal}</td>
            <td>${tool.failed}</td>
            <td>${rule.maxFailed}</td>
            <td>${tool.skipped}</td>
            <td>${rule.maxSkipped}</td>
          </tr>
        `;
      })
      .join("");
  }
  return rows;
}

/**
 * カバレッジ行を描画する。
 * @param {any} coverage カバレッジ情報。
 * @returns {string} HTML文字列。
 */
function renderCoverageRows(coverage) {
  // summaryを条件で選ぶ。
  const summary = coverage && coverage.summary ? coverage.summary : null;
  // rulesを条件で選ぶ。
  const rules = coverage && coverage.rules ? coverage.rules : null;
  // metricsの一覧を用意する。
  const metrics = [
    { key: "lines", label: "Lines" },
    { key: "statements", label: "Statements" },
    { key: "functions", label: "Functions" },
    { key: "branches", label: "Branches" },
  ];
  // rowsを取得する。
  const rows = metrics
    .map((metric) => {
      // actualを条件で選ぶ。
      const actual = summary ? summary[metric.key] : null;
      // limitを条件で選ぶ。
      const limit = rules ? rules[metric.key] : null;
      // 状態を条件で選ぶ。
      const status =
        typeof actual === "number" && typeof limit === "number"
          ? actual >= limit
            ? "pass"
            : "fail"
          : "missing";
      return `
        <tr class="${status}">
          <td>${metric.label}</td>
          <td>${formatPercent(actual)}</td>
          <td>${formatPercent(limit)}</td>
        </tr>
      `;
    })
    .join("");
  return rows;
}

/**
 * ファイル別カバレッジの説明を描画する。
 * @param {any} fileRules しきい値。
 * @returns {string} HTML文字列。
 */
function renderFileCoverageHint(fileRules) {
  // hintの初期値を定義する。
  let hint = "";
  if (fileRules) {
    hint = `Thresholds: line ${fileRules.lines}% / statement ${fileRules.statements}% / function ` +
      `${fileRules.functions}% / branch ${fileRules.branches}%`;
  }
  return hint ? `<div class="gate-hint">${escapeHtml(hint)}</div>` : "";
}

/**
 * ファイル別カバレッジ行を描画する。
 * @param {any[]} files ファイル配列。
 * @returns {string} HTML文字列。
 */
function renderFileCoverageRows(files) {
  // rowsの初期値を定義する。
  let rows = "<tr class=\"missing\"><td colspan=\"6\">No file coverage data.</td></tr>";
  if (Array.isArray(files) && files.length > 0) {
    rows = files
      .map((file) => {
        // 状態を解決する。
        const statusClass = resolveGateStatusClass(file.status);
        // 状態を解決する。
        const statusLabel = resolveGateStatusLabel(file.status);
        return `
          <tr class="${statusClass}">
            <td class="file-cell">${escapeHtml(file.file)}</td>
            <td>${formatPercent(file.lines)}</td>
            <td>${formatPercent(file.statements)}</td>
            <td>${formatPercent(file.functions)}</td>
            <td>${formatPercent(file.branches)}</td>
            <td class="status">${statusLabel}</td>
          </tr>
        `;
      })
      .join("");
  }
  return rows;
}

/**
 * ファイル別カバレッジのセクションを描画する。
 * @param {any} coverage カバレッジ情報。
 * @returns {string} HTML文字列。
 */
function renderFileCoverageSection(coverage) {
  // sectionの初期値を定義する。
  let section = "";
  if (coverage) {
    // hintを取得する。
    const hint = renderFileCoverageHint(coverage.fileRules);
    // rowsを取得する。
    const rows = renderFileCoverageRows(coverage.files);
    section = `
      <div>
        <h3>File Coverage Gate</h3>
        ${hint}
        <table class="gate-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Lines</th>
              <th>Statements</th>
              <th>Functions</th>
              <th>Branches</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }
  return section;
}

/**
 * 品質ゲートのセクションを描画する。
 * @param {any | null} gate 品質ゲート結果。
 * @returns {string} HTML文字列。
 */
function renderGateSection(gate) {
  // sectionの初期値を定義する。
  let section = "";
  if (!gate) {
    section = `
      <section class="gate missing">
        <h2>Quality Gate</h2>
        <div class="gate-status missing">MISSING</div>
        <p class="meta">Gate report is not available yet.</p>
      </section>
    `;
  } else {
    // 状態を解決する。
    const gateStatusLabel = resolveGateStatusLabel(gate.status);
    // 状態を解決する。
    const gateStatusClass = resolveGateStatusClass(gate.status);
    // toolRowsを取得する。
    const toolRows = renderToolRows(gate.tools);
    // coverageRowsを取得する。
    const coverageRows = renderCoverageRows(gate.coverage);
    // fileCoverageSectionを取得する。
    const fileCoverageSection = renderFileCoverageSection(gate.coverage);
    // 一覧を取得する。
    const issueItems = renderGateIssues(gate.issues);
    section = `
      <section class="gate">
        <h2>Quality Gate</h2>
        <div class="gate-status ${gateStatusClass}">${gateStatusLabel}</div>
        <div class="gate-grid">
          <div>
            <h3>Tool Gates</h3>
            <table class="gate-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Min</th>
                  <th>Failed</th>
                  <th>Max</th>
                  <th>Skipped</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                ${toolRows}
              </tbody>
            </table>
          </div>
          <div>
            <h3>Coverage Gate</h3>
            <table class="gate-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Actual</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                ${coverageRows}
              </tbody>
            </table>
            ${fileCoverageSection}
            <h3>Gate Issues</h3>
            <ul class="gate-issues">
              ${issueItems}
            </ul>
          </div>
        </div>
      </section>
    `;
  }
  return section;
}

module.exports = {
  renderGateSection,
};
