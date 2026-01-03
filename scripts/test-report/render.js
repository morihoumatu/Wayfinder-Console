/**
 * 動的検証レポートのHTMLを描画する。
 * @file 動的検証レポートのHTMLを描画する。
 */
const { escapeHtml } = require("./utils");
const { renderGateSection } = require("./gate");

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
 * HTMLレポートを描画する。
 * @param {ToolSummary[]} tools ツールの集計情報。
 * @param {string} generatedAt 生成日時(ISO)。
 * @param {{ playwright: string, cypress: string }} links レポートリンク。
 * @param {any | null} gate 品質ゲートの結果。
 * @returns {string} HTML文字列。
 */
function renderReport(tools, generatedAt, links, gate) {
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

  const gateSection = renderGateSection(gate);
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
      .gate {
        margin-bottom: 24px;
        padding: 16px;
        background: #fff;
        border-radius: 12px;
      }
      .gate h2 {
        margin: 0 0 12px;
        font-size: 18px;
      }
      .gate h3 {
        margin: 16px 0 8px;
        font-size: 14px;
      }
      .gate-status {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .gate-status.pass {
        background: #dcfce7;
        color: #166534;
      }
      .gate-status.fail {
        background: #fee2e2;
        color: #991b1b;
      }
      .gate-status.missing {
        background: #fef3c7;
        color: #92400e;
      }
      .gate-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      .gate-table {
        width: 100%;
        border-collapse: collapse;
        background: #f9fafb;
        border-radius: 10px;
        overflow: hidden;
      }
      .gate-table th,
      .gate-table td {
        padding: 10px 12px;
        font-size: 13px;
      }
      .gate-hint {
        margin: 6px 0 8px;
        font-size: 12px;
        color: #6b7280;
      }
      .file-cell {
        font-family: "Consolas", "Courier New", monospace;
        font-size: 12px;
        word-break: break-all;
      }
      .gate-table thead {
        background: #111827;
        color: #fff;
      }
      .gate-issues {
        padding-left: 18px;
        margin: 8px 0 0;
        font-size: 13px;
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
    ${gateSection}
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
