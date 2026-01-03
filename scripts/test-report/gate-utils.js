/**
 * 品質ゲート描画の補助関数をまとめる。
 * @file 品質ゲート描画の補助関数をまとめる。
 */
"use strict";

// utilsからescapeHtmlを取得する。
const { escapeHtml } = require("./utils");

/**
 * パーセンテージを整形する。
 * @param {number | null} value 入力値。
 * @returns {string} 整形済み文字列。
 */
function formatPercent(value) {
  // 結果の初期値を定義する。
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
  // labelの初期値を定義する。
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
  // classNameの初期値を定義する。
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
  // 一覧の初期値を定義する。
  let items = "<li>No gate issues.</li>";
  if (Array.isArray(issues) && issues.length > 0) {
    items = issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("");
  }
  return items;
}

module.exports = {
  formatPercent,
  resolveGateStatusLabel,
  resolveGateStatusClass,
  renderGateIssues,
};
