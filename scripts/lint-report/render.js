/**
 * lintレポートHTMLの描画処理をまとめる。
 * @file lintレポートHTMLの描画処理をまとめる。
 */
const { REPORT_STYLE } = require("./styles");

/**
 * HTML特殊文字をエスケープする。
 * @param {any} value 入力値。
 * @returns {string} エスケープ済み文字列。
 */
function escapeHtml(value) {
  const text = String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 数値を表示用に整形する。
 * @param {any} value 入力値。
 * @returns {string} 表示文字列。
 */
function formatNumber(value) {
  return Number.isFinite(value) ? String(value) : "-";
}

/**
 * メッセージ行のHTMLを生成する。
 * @param {any[]} messages メッセージ配列。
 * @returns {string} HTML文字列。
 */
function renderMessageRows(messages) {
  return messages
    .map((/** @type {any} */ message) => {
      const severityClass =
        message.severity === "error" ? "severity-error" : "severity-warning";
      return `<tr class="${severityClass}">
  <td>${escapeHtml(message.severity)}</td>
  <td>${escapeHtml(message.rule)}</td>
  <td>${escapeHtml(formatNumber(message.line))}</td>
  <td>${escapeHtml(formatNumber(message.column))}</td>
  <td>${escapeHtml(message.message)}</td>
</tr>`;
    })
    .join("");
}

/**
 * ファイルセクションのHTMLを生成する。
 * @param {any} fileEntry ファイル情報。
 * @param {boolean} openByDefault 初期展開フラグ。
 * @returns {string} HTML文字列。
 */
function renderFileSection(fileEntry, openByDefault) {
  const openAttr = openByDefault ? " open" : "";
  return `<details class="file-block"${openAttr}>
  <summary>${escapeHtml(fileEntry.path)} (${fileEntry.messages.length})</summary>
  <table class="messages">
    <thead>
      <tr>
        <th>Severity</th>
        <th>Rule</th>
        <th>Line</th>
        <th>Col</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
      ${renderMessageRows(fileEntry.messages)}
    </tbody>
  </table>
</details>`;
}

/**
 * ツールセクションのHTMLを生成する。
 * @param {any} tool ツール情報。
 * @returns {string} HTML文字列。
 */
function renderToolSection(tool) {
  const statusLabel = tool.status === "ok" ? "OK" : "FAIL";
  const statusClass = tool.status === "ok" ? "status-ok" : "status-fail";
  const header = `<div class="tool-header">
  <div>
    <h2>${escapeHtml(tool.name)}</h2>
    <div class="tool-command">${escapeHtml(tool.command)}</div>
  </div>
  <div class="tool-status ${statusClass}">${statusLabel}</div>
</div>
<div class="tool-counts">
  <span>Errors: ${tool.errors}</span>
  <span>Warnings: ${tool.warnings}</span>
  <span>Files: ${tool.files.length}</span>
</div>`;

  let section = "";
  if (tool.toolError) {
    const output = tool.rawOutput.length > 0 ? tool.rawOutput : tool.toolError;
    section = `<section class="tool">
${header}
<div class="tool-error">${escapeHtml(tool.toolError)}</div>
<pre>${escapeHtml(output)}</pre>
</section>`;
  } else if (tool.files.length === 0) {
    section = `<section class="tool">
${header}
<p class="clean">No issues.</p>
</section>`;
  } else {
    const fileSections = tool.files
      .map((/** @type {any} */ fileEntry) => {
        const hasError = fileEntry.messages.some(
          (/** @type {any} */ message) => message.severity === "error"
        );
        return renderFileSection(fileEntry, hasError);
      })
      .join("");

    section = `<section class="tool">
${header}
${fileSections}
</section>`;
  }
  return section;
}

/**
 * レポート全体のHTMLを生成する。
 * @param {any} reportData レポートデータ。
 * @returns {string} HTML文字列。
 */
function renderReport(reportData) {
  const summaryRows = reportData.tools
    .map((/** @type {any} */ tool) => {
      const statusClass = tool.status === "ok" ? "status-ok" : "status-fail";
      return `<tr class="${statusClass}">
  <td>${escapeHtml(tool.name)}</td>
  <td>${tool.errors}</td>
  <td>${tool.warnings}</td>
  <td>${tool.files.length}</td>
  <td>${tool.status.toUpperCase()}</td>
</tr>`;
    })
    .join("");

  const toolSections = reportData.tools.map(renderToolSection).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lint Report</title>
    <style>
${REPORT_STYLE}
    </style>
  </head>
  <body>
    <header>
      <h1>Lint Report</h1>
      <div>Generated: ${escapeHtml(reportData.generatedAt)}</div>
      <div class="summary">
        <span>Errors: ${reportData.totalErrors}</span>
        <span>Warnings: ${reportData.totalWarnings}</span>
      </div>
    </header>
    <section class="tool">
      <h2>Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Errors</th>
            <th>Warnings</th>
            <th>Files</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows}
        </tbody>
      </table>
    </section>
    ${toolSections}
  </body>
</html>`;
}

module.exports = {
  escapeHtml,
  formatNumber,
  renderMessageRows,
  renderFileSection,
  renderToolSection,
  renderReport,
};
