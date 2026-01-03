/**
 * docsレポート向けのCSS描画をまとめる。
 * @file docsレポート向けのCSS描画をまとめる。
 */
"use strict";

const { escapeHtml } = require("./utils");

/**
 * CSSブロックを描画する。
 * @param {any} block CSSブロック情報。
 * @returns {string} HTML出力。
 */
function renderCssBlock(block) {
  let html = "<div class=\"doc-block\">";
  const contextText = Array.isArray(block.context)
    ? block.context.join(" > ")
    : "";
  const selectorText = contextText.length > 0
    ? `${contextText} > ${block.selector}`
    : block.selector;

  html += "<div class=\"doc-desc\">";
  html += "<span class=\"tag-title\">Selector</span> ";
  html += `<span class="doc-code">${escapeHtml(selectorText)}</span>`;
  html += "</div>";

  if (block.comment && block.comment.length > 0) {
    html += `<div class="doc-desc">${escapeHtml(block.comment)}</div>`;
  }

  if (Array.isArray(block.declarations) && block.declarations.length > 0) {
    html += "<div class=\"doc-tags\"><div class=\"tag-title\">Declarations</div><ul>";
    block.declarations.forEach((/** @type {any} */ declaration) => {
      const propertyText = declaration.property || "";
      const commentText = declaration.comment || "";
      const label = `${propertyText}: ${commentText}`.trim();
      html += `<li>${escapeHtml(label)}</li>`;
    });
    html += "</ul></div>";
  }

  html += "</div>";
  return html;
}

/**
 * CSSファイルセクションを描画する。
 * @param {any} fileDoc CSSファイル情報。
 * @returns {string} HTML出力。
 */
function renderCssFileSection(fileDoc) {
  let html = "<details class=\"file\">";
  html += `<summary>${escapeHtml(fileDoc.name)}`;
  html += ` <span class="path">${escapeHtml(fileDoc.path)}</span></summary>`;

  html += "<div class=\"section-title\">Purpose Comment</div>";
  if (fileDoc.purposeComment && fileDoc.purposeComment.length > 0) {
    html += `<div class="doc-block">${escapeHtml(fileDoc.purposeComment)}</div>`;
  } else {
    html += "<div class=\"about empty\">No purpose comment found.</div>";
  }

  html += "<div class=\"section-title\">CSS Blocks</div>";
  if (Array.isArray(fileDoc.blocks) && fileDoc.blocks.length > 0) {
    fileDoc.blocks.forEach((/** @type {any} */ block) => {
      html += renderCssBlock(block);
    });
  } else {
    html += "<div class=\"about empty\">No CSS blocks found.</div>";
  }

  html += "</details>";
  return html;
}

/**
 * CSSセクションを描画する。
 * @param {any[]} cssFiles CSSファイル配列。
 * @returns {string} HTML出力。
 */
function renderCssSection(cssFiles) {
  let html = "";
  if (Array.isArray(cssFiles) && cssFiles.length > 0) {
    html = "<section class=\"dir\">";
    html += "<h2>CSS</h2>";
    html += "<div class=\"dir-path\">styles</div>";
    html += "<div class=\"file-list\">";
    cssFiles.forEach((/** @type {any} */ fileDoc) => {
      html += renderCssFileSection(fileDoc);
    });
    html += "</div></section>";
  }
  return html;
}

module.exports = {
  renderCssSection,
};
