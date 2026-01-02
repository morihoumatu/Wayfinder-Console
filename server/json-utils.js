/**
 * OpenAIレスポンスからテキストを抽出する。
 * @param {any} response APIレスポンス。
 * @returns {string} 抽出テキスト。
 */
function extractOutputText(response) {
  let outputText = "";
  if (typeof response.output_text === "string") {
    outputText = response.output_text;
  } else if (Array.isArray(response.output)) {
    /** @type {string[]} */
    const textChunks = [];
    response.output.forEach((/** @type {any} */ item) => {
      if (!Array.isArray(item.content)) {
        return;
      }
      item.content.forEach((/** @type {any} */ content) => {
        if (
          (content.type === "output_text" || content.type === "text") &&
          content.text
        ) {
          textChunks.push(content.text);
        }
      });
    });
    outputText = textChunks.join("\n").trim();
  }
  return outputText;
}

/**
 * 文字列内のエスケープ判定を行う。
 * @param {string} text 対象テキスト。
 * @param {number} index 判定位置。
 * @returns {boolean} 判定結果。
 */
function isEscapedChar(text, index) {
  return text[index] === "\\" && index + 1 < text.length;
}

/**
 * 対応する閉じ括弧位置を探す。
 * @param {string} text 対象テキスト。
 * @param {number} startIndex 開始位置。
 * @returns {number} 閉じ括弧位置。
 */
function findMatchingBracket(text, startIndex) {
  const openChar = text[startIndex];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let matchIndex = -1;
  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (isEscapedChar(text, i)) {
        i += 1;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        matchIndex = i;
        break;
      }
    }
  }
  return matchIndex;
}

/**
 * テキスト内のJSONを抽出して解析する。
 * @param {string} text 入力テキスト。
 * @returns {any} 解析結果。
 */
function findJsonInText(text) {
  let parsed = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== "{" && ch !== "[") {
      continue;
    }
    const endIndex = findMatchingBracket(text, i);
    if (endIndex === -1) {
      continue;
    }
    const snippet = text.slice(i, endIndex + 1);
    try {
      parsed = JSON.parse(snippet);
      break;
    } catch (error) {
      parsed = null;
      // continue searching
    }
  }
  return parsed;
}

/**
 * テキストからJSONを抽出して解析する。
 * @param {string} text 入力テキスト。
 * @returns {any} 解析結果。
 */
function parseJsonFromText(text) {
  let parsed = null;
  if (text) {
    const trimmed = text.trim();
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      // Try fenced JSON blocks first.
      const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fencedMatch && typeof fencedMatch[1] === "string") {
        try {
          parsed = JSON.parse(fencedMatch[1].trim());
        } catch (innerError) {
          parsed = null;
        }
      }
      if (parsed === null) {
        parsed = findJsonInText(trimmed);
      }
    }
  }
  return parsed;
}

module.exports = {
  extractOutputText,
  parseJsonFromText,
  findJsonInText,
  isEscapedChar,
  findMatchingBracket,
};
