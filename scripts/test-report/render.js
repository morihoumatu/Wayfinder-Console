/**
 * 動的検証レポートのHTMLを描画する。
 * @file 動的検証レポートのHTMLを描画する。
 */

/**
 * @typedef {Object} ToolSummary
 * @property {string} name ツール名。
 * @property {string} status 状態(pass/fail/missing)。
 * @property {number} passed 成功数。
 * @property {number} failed 失敗数。
 * @property {number} skipped スキップ数。
 * @property {number} total 総数。
 * @property {number | null} durationMs 所要時間(ミリ秒)。
 * @property {string | null} reportLink HTMLレポートへのリンク。
 */

/**
 * 所要時間(ミリ秒)を短い文字列に整形する。
 * @param {number | null} durationMs 所要時間(ミリ秒)。
 * @returns {string} 整形結果。
 */
function formatDuration(durationMs) {
  let result = "-";
  if (typeof durationMs === "number" && Number.isFinite(durationMs)) {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    if (totalSeconds < 60) {
      result = `${totalSeconds}s`;
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      result = `${minutes}m ${seconds}s`;
    }
  }
  return result;
}

/**
 * HTML用に文字列をエスケープする。
 * @param {string} value 入力文字列。
 * @returns {string} エスケープ後の文字列。
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * HTMLレポートを描画する。
 * @param {ToolSummary[]} tools ツールの集計情報。
 * @param {string} generatedAt 生成日時(ISO)。
 * @param {{ playwright: string, cypress: string }} links レポートリンク。
 * @returns {string} HTML文字列。
 */
function renderReport(tools, generatedAt, links) {
  const rows = tools
    .map((tool) => {
      const statusLabel =
        tool.status === "pass"
          ? "PASS"
          : tool.status === "fail"
            ? "FAIL"
            : "MISSING";
      const reportLink = tool.reportLink
        ? `<a href="${tool.reportLink}">Open</a>`
        : "-";
      return `
        <tr class="${escapeHtml(tool.status)}">
          <td>${escapeHtml(tool.name)}</td>
          <td class="status">${statusLabel}</td>
          <td>${tool.passed}</td>
          <td>${tool.failed}</td>
          <td>${tool.skipped}</td>
          <td>${tool.total}</td>
          <td>${formatDuration(tool.durationMs)}</td>
          <td>${reportLink}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dynamic Test Report</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        padding: 32px;
        font-family: "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif;
        background: #f5f5f7;
        color: #1c1c1c;
      }
      header {
        margin-bottom: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }
      .meta {
        color: #555;
        font-size: 14px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
      }
      thead {
        background: #111827;
        color: #fff;
      }
      th,
      td {
        text-align: left;
        padding: 12px 14px;
        font-size: 14px;
      }
      tbody tr:nth-child(even) {
        background: #f9fafb;
      }
      .status {
        font-weight: 600;
      }
      tr.pass .status {
        color: #116530;
      }
      tr.fail .status {
        color: #b91c1c;
      }
      tr.missing .status {
        color: #b45309;
      }
      .links {
        margin-top: 16px;
        font-size: 13px;
      }
      .links a {
        color: #1d4ed8;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Dynamic Test Report</h1>
      <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
    </header>
    <table>
      <thead>
        <tr>
          <th>Tool</th>
          <th>Status</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Skipped</th>
          <th>Total</th>
          <th>Duration</th>
          <th>Report</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="links">
      Playwright HTML: <a href="${links.playwright}">open</a> |
      Cypress HTML: <a href="${links.cypress}">open</a>
    </div>
  </body>
</html>
`;
}

module.exports = {
  renderReport,
};
