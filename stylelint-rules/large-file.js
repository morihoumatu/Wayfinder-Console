/**
 * CSSファイルの分割基準を検知するStylelintルールを提供する。
 * @file CSSファイルの分割基準を検知するStylelintルールを提供する。
 */
/* eslint-env node */
"use strict";

const stylelint = require("stylelint");

const RULE_NAME = "project/large-file";
const messages = stylelint.utils.ruleMessages(RULE_NAME, {
  exceed: (detailText) =>
    `CSSファイルが肥大化しています。${detailText}`,
});

const DEFAULT_LIMITS = {
  maxLines: 300,
  maxRules: 40,
  maxSelectors: 120,
  maxDeclarations: 300,
};

/**
 * 数値として妥当か判定する。
 * @param {any} value 判定対象。
 * @returns {boolean} 数値として妥当かどうか。
 */
function isNumberOption(value) {
  let result = false;
  if (typeof value === "number" && Number.isFinite(value)) {
    result = true;
  }
  return result;
}

/**
 * 数値の設定値を正規化する。
 * @param {any} value 入力値。
 * @param {number} fallback フォールバック値。
 * @returns {number} 正規化済み数値。
 */
function toPositiveNumber(value, fallback) {
  let result = fallback;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    result = value;
  }
  return result;
}

/**
 * ルール設定を正規化する。
 * @param {any} primaryOption ルール設定値。
 * @returns {any} 正規化済み設定値。
 */
function normalizeLimits(primaryOption) {
  let optionValue = {};
  if (primaryOption && typeof primaryOption === "object") {
    optionValue = primaryOption;
  }
  const normalized = {
    maxLines: toPositiveNumber(optionValue.maxLines, DEFAULT_LIMITS.maxLines),
    maxRules: toPositiveNumber(optionValue.maxRules, DEFAULT_LIMITS.maxRules),
    maxSelectors: toPositiveNumber(
      optionValue.maxSelectors,
      DEFAULT_LIMITS.maxSelectors
    ),
    maxDeclarations: toPositiveNumber(
      optionValue.maxDeclarations,
      DEFAULT_LIMITS.maxDeclarations
    ),
  };
  return normalized;
}

/**
 * CSSの行数を数える。
 * @param {string} cssText CSS全体文字列。
 * @returns {number} 行数。
 */
function countLines(cssText) {
  let count = 0;
  if (typeof cssText === "string" && cssText.length > 0) {
    count = cssText.split(/\r?\n/).length;
  }
  return count;
}

/**
 * ルール数を数える。
 * @param {any} root ルートノード。
 * @returns {number} ルール数。
 */
function countRules(root) {
  let count = 0;
  if (root && typeof root.walkRules === "function") {
    root.walkRules(() => {
      count += 1;
    });
  }
  return count;
}

/**
 * セレクタ配列を取得する。
 * @param {any} rule ルールノード。
 * @returns {string[]} セレクタ配列。
 */
function getSelectors(rule) {
  /** @type {string[]} */
  let selectors = [];
  if (rule) {
    if (Array.isArray(rule.selectors)) {
      selectors = rule.selectors;
    } else if (typeof rule.selector === "string") {
      selectors = rule.selector.split(",");
    }
  }
  return selectors
    .map((selector) => selector.trim())
    .filter((selector) => selector.length > 0);
}

/**
 * セレクタ数を数える。
 * @param {any} root ルートノード。
 * @returns {number} セレクタ数。
 */
function countSelectors(root) {
  let count = 0;
  if (root && typeof root.walkRules === "function") {
    root.walkRules((rule) => {
      count += getSelectors(rule).length;
    });
  }
  return count;
}

/**
 * 宣言数を数える。
 * @param {any} root ルートノード。
 * @returns {number} 宣言数。
 */
function countDeclarations(root) {
  let count = 0;
  if (root && typeof root.walkDecls === "function") {
    root.walkDecls(() => {
      count += 1;
    });
  }
  return count;
}

/**
 * 超過項目の一覧を作成する。
 * @param {any} counts 実測値。
 * @param {any} limits 閾値設定。
 * @returns {string[]} 超過項目一覧。
 */
function buildExceededList(counts, limits) {
  /** @type {string[]} */
  const exceeded = [];
  if (counts.lines > limits.maxLines) {
    exceeded.push(
      `行数 ${counts.lines}/${limits.maxLines}`
    );
  }
  if (counts.rules > limits.maxRules) {
    exceeded.push(
      `ルール数 ${counts.rules}/${limits.maxRules}`
    );
  }
  if (counts.selectors > limits.maxSelectors) {
    exceeded.push(
      `セレクタ数 ${counts.selectors}/${limits.maxSelectors}`
    );
  }
  if (counts.declarations > limits.maxDeclarations) {
    exceeded.push(
      `宣言数 ${counts.declarations}/${limits.maxDeclarations}`
    );
  }
  return exceeded;
}

/**
 * 検知結果を報告する。
 * @param {any} root ルートノード。
 * @param {any} result 結果オブジェクト。
 * @param {string[]} exceeded 超過項目一覧。
 */
function reportExceeded(root, result, exceeded) {
  const detailText = exceeded.join(", ");
  stylelint.utils.report({
    ruleName: RULE_NAME,
    result,
    node: root,
    message: messages.exceed(detailText),
  });
}

/**
 * ルール本体を生成する。
 * @param {any} primaryOption ルール設定値。
 * @returns {(root: any, result: any) => void} 実行関数。
 */
function createRule(primaryOption) {
  return (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, RULE_NAME, {
      actual: primaryOption,
      possible: {
        maxLines: isNumberOption,
        maxRules: isNumberOption,
        maxSelectors: isNumberOption,
        maxDeclarations: isNumberOption,
      },
      optional: true,
    });

    let shouldCheck = validOptions;
    if (primaryOption === null) {
      shouldCheck = false;
    }

    if (shouldCheck) {
      const limits = normalizeLimits(primaryOption);
      const cssText =
        root && root.source && root.source.input
          ? root.source.input.css
          : "";
      const counts = {
        lines: countLines(cssText),
        rules: countRules(root),
        selectors: countSelectors(root),
        declarations: countDeclarations(root),
      };
      const exceeded = buildExceededList(counts, limits);
      if (exceeded.length > 0) {
        reportExceeded(root, result, exceeded);
      }
    }
  };
}

module.exports = stylelint.createPlugin(RULE_NAME, createRule);
module.exports.ruleName = RULE_NAME;
module.exports.messages = messages;
