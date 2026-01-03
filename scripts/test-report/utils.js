/**
 * レポート描画の補助関数をまとめる。
 * @file レポート描画の補助関数をまとめる。
 */

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

module.exports = {
  escapeHtml,
};
