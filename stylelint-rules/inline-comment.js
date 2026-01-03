/**
 * CSSのブロックと宣言の右側コメントを検知するStylelintルールを提供する。
 * @file CSSのブロックと宣言の右側コメントを検知するStylelintルールを提供する。
 */
/* eslint-env node */
"use strict";

// stylelintモジュールを読み込む。
const stylelint = require("stylelint");

// RULE_NAMEの定数を定義する。
const RULE_NAME = "project/inline-comment";
// メッセージを取得する。
const messages = stylelint.utils.ruleMessages(RULE_NAME, {
  block: "Block must include an inline comment on the right side.",
  decl: "Declaration must include an inline comment on the right side.",
});

/**
 * CSS文字列を行配列に分割する。
 * @param {string} cssText CSS全体文字列。
 * @returns {string[]} 行配列。
 */
function buildLines(cssText) {
  // linesの一覧を用意する。
  let lines = [];
  if (typeof cssText === "string") {
    lines = cssText.split(/\r?\n/);
  }
  return lines;
}

/**
 * 指定行番号の文字列を取得する。
 * @param {string[]} lines 行配列。
 * @param {number | null} lineNumber 行番号。
 * @returns {string} 行の内容。
 */
function getLineText(lines, lineNumber) {
  // メッセージの初期値を定義する。
  let text = "";
  if (Array.isArray(lines) && typeof lineNumber === "number") {
    // インデックスを用意する。
    const index = lineNumber - 1;
    if (index >= 0 && index < lines.length) {
      text = lines[index];
    }
  }
  return text;
}

/**
 * ノードの開始行番号を取得する。
 * @param {any} node 対象ノード。
 * @returns {number | null} 開始行番号。
 */
function getNodeStartLine(node) {
  // lineNumberの初期値を定義する。
  let lineNumber = null;
  if (node && node.source && node.source.start) {
    if (typeof node.source.start.line === "number") {
      lineNumber = node.source.start.line;
    }
  }
  return lineNumber;
}

/**
 * ノードの終了行番号を取得する。
 * @param {any} node 対象ノード。
 * @returns {number | null} 終了行番号。
 */
function getNodeEndLine(node) {
  // lineNumberの初期値を定義する。
  let lineNumber = null;
  if (node && node.source && node.source.end) {
    if (typeof node.source.end.line === "number") {
      lineNumber = node.source.end.line;
    }
  }
  return lineNumber;
}

/**
 * ノードの終了列番号を取得する。
 * @param {any} node 対象ノード。
 * @returns {number | null} 終了列番号。
 */
function getNodeEndColumn(node) {
  // columnNumberの初期値を定義する。
  let columnNumber = null;
  if (node && node.source && node.source.end) {
    if (typeof node.source.end.column === "number") {
      columnNumber = node.source.end.column;
    }
  }
  return columnNumber;
}

/**
 * ブロック開始行の情報を探索する。
 * @param {string[]} lines 行配列。
 * @param {number | null} startLine 開始行番号。
 * @param {number | null} endLine 終了行番号。
 * @returns {{ lineNumber: number, lineText: string, braceIndex: number } | null} 行情報。
 */
function findOpeningBraceInfo(lines, startLine, endLine) {
  /** @type {{ lineNumber: number, lineText: string, braceIndex: number } | null} */
  let info = null;
  if (typeof startLine === "number" && typeof endLine === "number") {
    // lineNumberの参照を保持する。
    let lineNumber = startLine;
    while (lineNumber <= endLine && !info) {
      // メッセージを取得する。
      const lineText = getLineText(lines, lineNumber);
      // インデックスを取得する。
      const braceIndex = lineText.indexOf("{");
      if (braceIndex !== -1) {
        info = {
          lineNumber,
          lineText,
          braceIndex,
        };
      }
      lineNumber += 1;
    }
  }
  return info;
}

/**
 * 行内コメントの有無を判定する。
 * @param {string} lineText 行文字列。
 * @param {number} startIndex 検索開始位置。
 * @returns {boolean} コメントがあるかどうか。
 */
function hasInlineCommentAfter(lineText, startIndex) {
  // foundの初期値を定義する。
  let found = false;
  if (typeof lineText === "string") {
    // インデックスを取得する。
    const safeIndex = Math.max(startIndex, 0);
    found = lineText.indexOf("/*", safeIndex) !== -1;
  }
  return found;
}

/**
 * ブロック行の右側コメントを判定する。
 * @param {string[]} lines 行配列。
 * @param {any} node ルールノード。
 * @returns {boolean} コメントがあるかどうか。
 */
function hasBlockInlineComment(lines, node) {
  // 判定結果の初期値を定義する。
  let hasComment = false;
  // startLineを取得する。
  const startLine = getNodeStartLine(node);
  // endLineを取得する。
  const endLine = getNodeEndLine(node);
  // infoを取得する。
  const info = findOpeningBraceInfo(lines, startLine, endLine);
  if (info) {
    hasComment = hasInlineCommentAfter(info.lineText, info.braceIndex + 1);
  }
  return hasComment;
}

/**
 * 宣言行の右側コメントを判定する。
 * @param {string[]} lines 行配列。
 * @param {any} decl 宣言ノード。
 * @returns {boolean} コメントがあるかどうか。
 */
function hasDeclInlineComment(lines, decl) {
  // 判定結果の初期値を定義する。
  let hasComment = false;
  // endLineを取得する。
  const endLine = getNodeEndLine(decl);
  // endColumnを取得する。
  const endColumn = getNodeEndColumn(decl);
  if (typeof endLine === "number" && typeof endColumn === "number") {
    // メッセージを取得する。
    const lineText = getLineText(lines, endLine);
    hasComment = hasInlineCommentAfter(lineText, endColumn);
  }
  return hasComment;
}

/**
 * ブロックコメント不足を報告する。
 * @param {any} node 対象ノード。
 * @param {any} result 結果オブジェクト。
 */
function reportMissingBlock(node, result) {
  stylelint.utils.report({
    ruleName: RULE_NAME,
    result,
    node,
    message: messages.block,
  });
}

/**
 * 宣言コメント不足を報告する。
 * @param {any} node 対象ノード。
 * @param {any} result 結果オブジェクト。
 */
function reportMissingDecl(node, result) {
  stylelint.utils.report({
    ruleName: RULE_NAME,
    result,
    node,
    message: messages.decl,
  });
}

/**
 * ブロックのコメント有無を検知する。
 * @param {string[]} lines 行配列。
 * @param {any} root ルートノード。
 * @param {any} result 結果オブジェクト。
 */
function lintBlocks(lines, root, result) {
  root.walkRules((rule) => {
    if (!hasBlockInlineComment(lines, rule)) {
      reportMissingBlock(rule, result);
    }
  });

  root.walkAtRules((atRule) => {
    // 判定結果を条件で選ぶ。
    const hasNodes =
      Array.isArray(atRule.nodes) && atRule.nodes.length > 0;
    if (hasNodes && !hasBlockInlineComment(lines, atRule)) {
      reportMissingBlock(atRule, result);
    }
  });
}

/**
 * 宣言のコメント有無を検知する。
 * @param {string[]} lines 行配列。
 * @param {any} root ルートノード。
 * @param {any} result 結果オブジェクト。
 */
function lintDeclarations(lines, root, result) {
  root.walkDecls((decl) => {
    if (!hasDeclInlineComment(lines, decl)) {
      reportMissingDecl(decl, result);
    }
  });
}

/**
 * ルール本体を生成する。
 * @param {boolean} primaryOption 有効化フラグ。
 * @returns {(root: any, result: any) => void} 実行関数。
 */
function createRule(primaryOption) {
  return (root, result) => {
    // enabledの初期値を定義する。
    let enabled = true;
    if (primaryOption === false) {
      enabled = false;
    }
    if (enabled) {
      // メッセージを条件で選ぶ。
      const cssText =
        root && root.source && root.source.input
          ? root.source.input.css
          : "";
      // linesを作成する。
      const lines = buildLines(cssText);
      lintBlocks(lines, root, result);
      lintDeclarations(lines, root, result);
    }
  };
}

module.exports = stylelint.createPlugin(RULE_NAME, createRule);
module.exports.ruleName = RULE_NAME;
module.exports.messages = messages;
