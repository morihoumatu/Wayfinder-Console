/**
 * 品質ゲートのHTML描画をまとめる。
 * @file 品質ゲートのHTML描画をまとめる。
 */
const { escapeHtml } = require("./utils");

/**
 * パーセンテージを整形する。
 * @param {number | null} value 入力値。
 * @returns {string} 整形済み文字列。
 */
function formatPercent(value) {
  let result = "-";
  if (typeof value === "number" && Number.isFinite(value)) {
    result = `${value.toFixed(2)}%`;
  }
  return result;
}

/**
 * ゲートステータスのラベルを返す。
 * @param {string} status 状態値。
 * @returns {string} 表示ラベル。
 */
function resolveGateStatusLabel(status) {
  let label = "MISSING";
  if (status === "pass") {
    label = "PASS";
  } else if (status === "fail") {
    label = "FAIL";
  }
  return label;
}

/**
 * ゲートステータスのクラス名を返す。
 * @param {string} status 状態値。
 * @returns {string} クラス名。
 */
function resolveGateStatusClass(status) {
  let className = "missing";
  if (status === "pass") {
    className = "pass";
  } else if (status === "fail") {
    className = "fail";
  }
  return className;
}

/**
 * ゲートの課題リストを描画する。
 * @param {string[]} issues 課題一覧。
 * @returns {string} HTML文字列。
 */
function renderGateIssues(issues) {
  let items = "<li>No gate issues.</li>";
  if (Array.isArray(issues) && issues.length > 0) {
    items = issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("");
  }
  return items;
}

/**
 * ツール別ゲート行を描画する。
 * @param {any[]} tools ツール配列。
 * @returns {string} HTML文字列。
 */
function renderToolRows(tools) {
  let rows = "";
  if (Array.isArray(tools)) {
    rows = tools
      .map((tool) => {
        const toolStatus =
          tool.status === "pass"
            ? "pass"
            : tool.status === "fail"
              ? "fail"
              : "missing";
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
  const summary = coverage && coverage.summary ? coverage.summary : null;
  const rules = coverage && coverage.rules ? coverage.rules : null;
  const metrics = [
    { key: "lines", label: "Lines" },
    { key: "statements", label: "Statements" },
    { key: "functions", label: "Functions" },
    { key: "branches", label: "Branches" },
  ];
  const rows = metrics
    .map((metric) => {
      const actual = summary ? summary[metric.key] : null;
      const limit = rules ? rules[metric.key] : null;
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
  let rows = "<tr class=\"missing\"><td colspan=\"6\">No file coverage data.</td></tr>";
  if (Array.isArray(files) && files.length > 0) {
    rows = files
      .map((file) => {
        const statusClass = resolveGateStatusClass(file.status);
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
  let section = "";
  if (coverage) {
    const hint = renderFileCoverageHint(coverage.fileRules);
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
    const gateStatusLabel = resolveGateStatusLabel(gate.status);
    const gateStatusClass = resolveGateStatusClass(gate.status);
    const toolRows = renderToolRows(gate.tools);
    const coverageRows = renderCoverageRows(gate.coverage);
    const fileCoverageSection = renderFileCoverageSection(gate.coverage);
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
