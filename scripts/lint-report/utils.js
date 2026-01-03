/**
 * lintレポート共通処理をまとめる。
 * @file lintレポート共通処理をまとめる。
 */
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");
// child_processからspawnSyncを取得する。
const { spawnSync } = require("child_process");

// configから必要な値を取得する。
const { BIN_DIR, BIN_EXT, BASE_ENV, ROOT_DIR } = require("./config");

/**
 * コマンド実行パスを解決する。
 * @param {string} command コマンド名。
 * @returns {string} 解決したパス。
 */
function resolveBin(command) {
  // パスを組み立てる。
  const binPath = path.join(BIN_DIR, `${command}${BIN_EXT}`);
  // resolvedを条件で選ぶ。
  const resolved = fs.existsSync(binPath) ? binPath : command;
  return resolved;
}

/**
 * コマンドを同期実行する。
 * @param {string} command コマンド名。
 * @param {string[]} args 引数配列。
 * @returns {any} 実行結果。
 */
function runCommand(command, args) {
  // resolvedCommandを解決する。
  const resolvedCommand = resolveBin(command);
  // useShellを用意する。
  const useShell = process.platform === "win32";
  // 結果を取得する。
  const result = spawnSync(resolvedCommand, args, {
    encoding: "utf8",
    env: BASE_ENV,
    shell: useShell,
    windowsHide: true,
  });

  // outputを後で設定するために用意する。
  let output;
  if (result.error) {
    output = {
      command,
      resolvedCommand,
      args,
      status: 1,
      stdout: "",
      stderr: result.error.message || String(result.error),
      hasError: true,
    };
  } else {
    // 状態を条件で選ぶ。
    const status = typeof result.status === "number" ? result.status : 1;
    output = {
      command,
      resolvedCommand,
      args,
      status,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      hasError: false,
    };
  }
  return output;
}

/**
 * 標準出力と標準エラーを結合する。
 * @param {string} stdout 標準出力。
 * @param {string} stderr 標準エラー。
 * @returns {string} 結合文字列。
 */
function combineOutput(stdout, stderr) {
  return `${stdout}${stderr}`.trim();
}

/**
 * 文字列からJSONを解析する。
 * @param {string} text 入力文字列。
 * @returns {any | null} 解析結果またはnull。
 */
function parseJsonOutput(text) {
  // parsedの初期値を定義する。
  let parsed = null;
  if (typeof text === "string") {
    // trimmedを取得する。
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (error) {
        parsed = null;
      }
    }
  }
  return parsed;
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
  // openCharの参照を保持する。
  const openChar = text[startIndex];
  // closeCharを条件で選ぶ。
  const closeChar = openChar === "{" ? "}" : "]";
  // depthの初期値を定義する。
  let depth = 0;
  // inStringの初期値を定義する。
  let inString = false;
  // インデックスを用意する。
  let matchIndex = -1;
  // iをループ用に用意する。
  for (let i = startIndex; i < text.length; i += 1) {
    // chの参照を保持する。
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
 * @returns {any | null} 解析結果またはnull。
 */
function parseJsonFromText(text) {
  // parsedの初期値を定義する。
  let parsed = null;
  if (typeof text === "string") {
    // trimmedを取得する。
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      // directを解析する。
      const direct = parseJsonOutput(trimmed);
      if (direct) {
        parsed = direct;
      } else {
        // iをループ用に用意する。
        for (let i = 0; i < trimmed.length; i += 1) {
          // chの参照を保持する。
          const ch = trimmed[i];
          if (ch !== "{" && ch !== "[") {
            continue;
          }
          // インデックスを取得する。
          const endIndex = findMatchingBracket(trimmed, i);
          if (endIndex === -1) {
            continue;
          }
          // snippetを取得する。
          const snippet = trimmed.slice(i, endIndex + 1);
          // IDを解析する。
          const candidate = parseJsonOutput(snippet);
          if (candidate) {
            parsed = candidate;
            break;
          }
        }
      }
    }
  }
  return parsed;
}

/**
 * ファイルパスを相対パスに変換する。
 * @param {string} filePathValue ファイルパス。
 * @returns {string} 相対パス。
 */
function toRelativePath(filePathValue) {
  // normalizedの初期値を定義する。
  let normalized = "unknown";
  if (typeof filePathValue === "string" && filePathValue.length > 0) {
    // パス情報を取得する。
    const relative = path.relative(ROOT_DIR, filePathValue);
    if (relative.length === 0) {
      normalized = filePathValue;
    } else if (relative.startsWith("..") || path.isAbsolute(relative)) {
      normalized = filePathValue;
    } else {
      normalized = relative;
    }
  }
  return normalized;
}

/**
 * 数値を正規化してnull許容にする。
 * @param {any} value 入力値。
 * @returns {number | null} 正規化数値。
 */
function normalizeNumber(value) {
  return Number.isFinite(value) ? value : null;
}

/**
 * 重大度を正規化する。
 * @param {string} severityValue 重大度文字列。
 * @returns {string} 正規化重大度。
 */
function normalizeSeverity(severityValue) {
  // normalizedを条件で選ぶ。
  const normalized = severityValue === "warning" ? "warning" : "error";
  return normalized;
}

/**
 * メッセージ情報を組み立てる。
 * @param {{
 *   lineValue: number | null,
 *   columnValue: number | null,
 *   severityValue: string,
 *   ruleValue: string,
 *   text: string
 * }} entry メッセージ入力。
 * @returns {any} メッセージオブジェクト。
 */
function buildMessage(entry) {
  // lineValueの参照を保持する。
  const { lineValue, columnValue, severityValue, ruleValue, text } = entry;
  return {
    line: normalizeNumber(lineValue),
    column: normalizeNumber(columnValue),
    severity: normalizeSeverity(severityValue),
    rule: typeof ruleValue === "string" ? ruleValue : "",
    message: typeof text === "string" ? text : "",
  };
}

module.exports = {
  resolveBin,
  runCommand,
  combineOutput,
  parseJsonOutput,
  parseJsonFromText,
  isEscapedChar,
  findMatchingBracket,
  toRelativePath,
  normalizeNumber,
  normalizeSeverity,
  buildMessage,
};
