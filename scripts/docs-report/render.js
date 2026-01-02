/**
 * docsレポートHTMLを描画する。
 * @file docsレポートHTMLを描画する。
 */
"use strict";

const { escapeHtml } = require("./utils");

const STYLE = `
:root {
  color-scheme: light;
}
body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: #f7f7f9;
  color: #1f2933;
  margin: 0;
  padding: 24px;
}
header {
  background: #ffffff;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  margin-bottom: 24px;
}
h1 {
  margin: 0 0 8px;
  font-size: 1.8rem;
}
.dir {
  background: #ffffff;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  margin-bottom: 20px;
}
.dir h2 {
  margin: 0 0 4px;
  font-size: 1.4rem;
}
.dir-path {
  color: #64748b;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 0.85rem;
  margin-bottom: 12px;
}
.about {
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  white-space: pre-wrap;
}
.about.empty {
  color: #94a3b8;
}
.file-list {
  margin-top: 16px;
}
.file {
  background: #f8fafc;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.file summary {
  cursor: pointer;
  font-weight: 600;
}
.file .path {
  color: #64748b;
  font-weight: 400;
  margin-left: 8px;
  font-size: 0.85rem;
}
.section-title {
  font-weight: 700;
  margin: 12px 0 6px;
}
.doc-block {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
}
.doc-desc {
  margin-bottom: 6px;
}
.doc-tags {
  margin-top: 6px;
}
.doc-tags ul {
  margin: 4px 0 0 16px;
}
.tag-title {
  font-weight: 700;
  color: #0f172a;
}
.subdirs {
  margin-top: 16px;
  padding-left: 16px;
  border-left: 3px solid #e2e8f0;
}
`;

/**
 * JSDocブロックを描画する。
 * @param {any} doc 解析済みブロック。
 * @returns {string} HTML出力。
 */
function renderDocBlock(doc) {
  let html = "<div class=\"doc-block\">";

  if (doc.description.length > 0) {
    const descText = doc.description.join(" ");
    html += `<div class="doc-desc">${escapeHtml(descText)}</div>`;
  }
  if (doc.params.length > 0) {
    html += "<div class=\"doc-tags\"><div class=\"tag-title\">@param</div><ul>";
    doc.params.forEach((param) => {
      html += `<li>${escapeHtml(param)}</li>`;
    });
    html += "</ul></div>";
  }
  if (doc.returns.length > 0) {
    html += "<div class=\"doc-tags\"><div class=\"tag-title\">@returns</div><ul>";
    doc.returns.forEach((returnValue) => {
      html += `<li>${escapeHtml(returnValue)}</li>`;
    });
    html += "</ul></div>";
  }

  html += "</div>";
  return html;
}

/**
 * ファイルセクションを描画する。
 * @param {any} fileDoc ファイル情報。
 * @returns {string} HTML出力。
 */
function renderFileSection(fileDoc) {
  let html = "<details class=\"file\">";
  html += `<summary>${escapeHtml(fileDoc.name)}`;
  html += ` <span class="path">${escapeHtml(fileDoc.path)}</span></summary>`;

  html += "<div class=\"section-title\">Top Comment</div>";
  if (fileDoc.topComment) {
    html += renderDocBlock(fileDoc.topComment);
  } else {
    html += "<div class=\"about empty\">No top comment found.</div>";
  }

  html += "<div class=\"section-title\">JSDoc Blocks</div>";
  if (fileDoc.docs.length > 0) {
    fileDoc.docs.forEach((doc) => {
      html += renderDocBlock(doc);
    });
  } else {
    html += "<div class=\"about empty\">No JSDoc blocks found.</div>";
  }

  html += "</details>";
  return html;
}

/**
 * ディレクトリセクションを描画する。
 * @param {any} dirNode ディレクトリノード。
 * @returns {string} HTML出力。
 */
function renderDirSection(dirNode) {
  let html = "<section class=\"dir\">";
  html += `<h2>${escapeHtml(dirNode.name)}</h2>`;
  html += `<div class="dir-path">${escapeHtml(dirNode.path)}</div>`;

  if (dirNode.about) {
    html += `<pre class="about">${escapeHtml(dirNode.about)}</pre>`;
  } else {
    html += "<div class=\"about empty\">No ABOUT.md found.</div>";
  }

  if (dirNode.files.length > 0) {
    html += "<div class=\"file-list\">";
    dirNode.files.forEach((fileDoc) => {
      html += renderFileSection(fileDoc);
    });
    html += "</div>";
  }

  if (dirNode.subdirs.length > 0) {
    html += "<div class=\"subdirs\">";
    dirNode.subdirs.forEach((subdir) => {
      html += renderDirSection(subdir);
    });
    html += "</div>";
  }

  html += "</section>";
  return html;
}

/**
 * HTML全体を描画する。
 * @param {any} reportData レポートデータ。
 * @returns {string} HTML出力。
 */
function renderHtml(reportData) {
  const dirSections = reportData.roots.map(renderDirSection).join("");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Project Docs</title>
    <style>
${STYLE}
    </style>
  </head>
  <body>
    <header>
      <h1>Folder &amp; Comment Documentation</h1>
      <div>Generated: ${escapeHtml(reportData.generatedAt)}</div>
    </header>
    ${dirSections}
  </body>
</html>`;
  return html;
}

module.exports = {
  renderHtml,
};
