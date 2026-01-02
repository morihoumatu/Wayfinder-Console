/* eslint-env node */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = process.cwd();
const REPORT_DIR = path.join(ROOT_DIR, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "lint-report.html");
const BIN_DIR = path.join(ROOT_DIR, "node_modules", ".bin");
const BIN_EXT = process.platform === "win32" ? ".cmd" : "";

const BASE_ENV = {
  ...process.env,
  FORCE_COLOR: "0",
  NO_COLOR: "1",
};

const TSC_REGEX_PAREN =
  /^(.*)\((\d+),(\d+)\): (error|warning) TS(\d+): (.*)$/;
const TSC_REGEX_COLON =
  /^(.*):(\d+):(\d+) - (error|warning) TS(\d+): (.*)$/;
const TSC_REGEX_GLOBAL = /^(error|warning) TS(\d+): (.*)$/;

/**
 * コマンド実行パスを解決する。
 * @param {string} command コマンド名。
 * @returns {string} 解決したパス。
 */
function resolveBin(command) {
  const binPath = path.join(BIN_DIR, `${command}${BIN_EXT}`);
  if (fs.existsSync(binPath)) {
    return binPath;
  }
  return command;
}

/**
 * コマンドを同期実行する。
 * @param {string} command コマンド名。
 * @param {string[]} args 引数配列。
 * @returns {any} 実行結果。
 */
function runCommand(command, args) {
  const resolvedCommand = resolveBin(command);
  const useShell = process.platform === "win32";
  const result = spawnSync(resolvedCommand, args, {
    encoding: "utf8",
    env: BASE_ENV,
    shell: useShell,
    windowsHide: true,
  });

  if (result.error) {
    return {
      command,
      resolvedCommand,
      args,
      status: 1,
      stdout: "",
      stderr: result.error.message || String(result.error),
      hasError: true,
    };
  }

  const status = typeof result.status === "number" ? result.status : 1;

  return {
    command,
    resolvedCommand,
    args,
    status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    hasError: false,
  };
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
  if (typeof text !== "string") {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return null;
  }
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
  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\" && i + 1 < text.length) {
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
        return i;
      }
    }
  }
  return -1;
}

/**
 * テキスト内のJSONを抽出して解析する。
 * @param {string} text 入力テキスト。
 * @returns {any | null} 解析結果またはnull。
 */
function parseJsonFromText(text) {
  if (typeof text !== "string") {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const direct = parseJsonOutput(trimmed);
  if (direct) {
    return direct;
  }
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch !== "{" && ch !== "[") {
      continue;
    }
    const endIndex = findMatchingBracket(trimmed, i);
    if (endIndex === -1) {
      continue;
    }
    const snippet = trimmed.slice(i, endIndex + 1);
    const parsed = parseJsonOutput(snippet);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

/**
 * ファイルパスを相対パスに変換する。
 * @param {string} filePathValue ファイルパス。
 * @returns {string} 相対パス。
 */
function toRelativePath(filePathValue) {
  if (typeof filePathValue !== "string" || filePathValue.length === 0) {
    return "unknown";
  }
  const relative = path.relative(ROOT_DIR, filePathValue);
  if (relative.length === 0) {
    return filePathValue;
  }
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return filePathValue;
  }
  return relative;
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
  if (severityValue === "warning") {
    return "warning";
  }
  return "error";
}

/**
 * メッセージ情報を組み立てる。
 * @param {{ lineValue: number | null, columnValue: number | null, severityValue: string, ruleValue: string, text: string }} entry メッセージ入力。
 * @returns {any} メッセージオブジェクト。
 */
function buildMessage(entry) {
  const { lineValue, columnValue, severityValue, ruleValue, text } = entry;
  return {
    line: normalizeNumber(lineValue),
    column: normalizeNumber(columnValue),
    severity: normalizeSeverity(severityValue),
    rule: typeof ruleValue === "string" ? ruleValue : "",
    message: typeof text === "string" ? text : "",
  };
}

/**
 * ESLintの出力を解析する。
 * @param {any} result 実行結果。
 * @returns {any} 解析済みレポート。
 */
function parseEslintOutput(result) {
  const rawOutput = combineOutput(result.stdout, result.stderr);
  if (result.hasError) {
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Command failed.",
      rawOutput,
    };
  }

  const parsed = parseJsonOutput(result.stdout);
  if (!parsed) {
    if (rawOutput.length === 0) {
      return { errors: 0, warnings: 0, files: [], toolError: null, rawOutput };
    }
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Unable to parse ESLint output.",
      rawOutput,
    };
  }
  if (!Array.isArray(parsed)) {
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Unexpected ESLint output.",
      rawOutput,
    };
  }

  const files = [];
  let errors = 0;
  let warnings = 0;

  parsed.forEach((entry) => {
    const messageList = Array.isArray(entry.messages) ? entry.messages : [];
    if (messageList.length === 0) {
      return;
    }
    const messages = messageList.map((message) => {
      const severity = message.severity === 2 ? "error" : "warning";
      if (severity === "error") {
        errors += 1;
      } else {
        warnings += 1;
      }
      return buildMessage({
        lineValue: message.line,
        columnValue: message.column,
        severityValue: severity,
        ruleValue: message.ruleId || "",
        text: message.message || "",
      });
    });
    files.push({
      path: toRelativePath(entry.filePath),
      messages,
    });
  });

  return { errors, warnings, files, toolError: null, rawOutput };
}

/**
 * Stylelintの出力を解析する。
 * @param {any} result 実行結果。
 * @returns {any} 解析済みレポート。
 */
function parseStylelintOutput(result) {
  const rawOutput = combineOutput(result.stdout, result.stderr);
  if (result.hasError) {
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Command failed.",
      rawOutput,
    };
  }

  const parsed = parseJsonFromText(result.stdout) || parseJsonFromText(rawOutput);
  if (!parsed) {
    if (rawOutput.length === 0) {
      return { errors: 0, warnings: 0, files: [], toolError: null, rawOutput };
    }
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Unable to parse Stylelint output.",
      rawOutput,
    };
  }
  if (!Array.isArray(parsed)) {
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Unexpected Stylelint output.",
      rawOutput,
    };
  }

  const files = [];
  let errors = 0;
  let warnings = 0;

  parsed.forEach((entry) => {
    const messages = [];
    const warningList = Array.isArray(entry.warnings) ? entry.warnings : [];
    warningList.forEach((warning) => {
      const severity = normalizeSeverity(warning.severity);
      if (severity === "error") {
        errors += 1;
      } else {
        warnings += 1;
      }
      messages.push(
        buildMessage({
          lineValue: warning.line,
          columnValue: warning.column,
          severityValue: severity,
          ruleValue: warning.rule || "",
          text: warning.text || "",
        })
      );
    });

    const parseErrors = Array.isArray(entry.parseErrors)
      ? entry.parseErrors
      : [];
    parseErrors.forEach((parseError) => {
      errors += 1;
      messages.push(
        buildMessage({
          lineValue: parseError.line,
          columnValue: parseError.column,
          severityValue: "error",
          ruleValue: "parse-error",
          text: parseError.text || "Parse error.",
        })
      );
    });

    const invalidOptionWarnings = Array.isArray(entry.invalidOptionWarnings)
      ? entry.invalidOptionWarnings
      : [];
    invalidOptionWarnings.forEach((invalidOption) => {
      errors += 1;
      messages.push(
        buildMessage({
          lineValue: null,
          columnValue: null,
          severityValue: "error",
          ruleValue: "invalid-option",
          text: invalidOption.text || "Invalid option.",
        })
      );
    });

    const deprecations = Array.isArray(entry.deprecations)
      ? entry.deprecations
      : [];
    deprecations.forEach((deprecation) => {
      warnings += 1;
      messages.push(
        buildMessage({
          lineValue: null,
          columnValue: null,
          severityValue: "warning",
          ruleValue: "deprecation",
          text: deprecation.text || "Deprecated rule.",
        })
      );
    });

    if (messages.length > 0) {
      files.push({
        path: toRelativePath(entry.source),
        messages,
      });
    }
  });

  return { errors, warnings, files, toolError: null, rawOutput };
}

/**
 * HTMLHintの出力を解析する。
 * @param {any} result 実行結果。
 * @returns {any} 解析済みレポート。
 */
function parseHtmlhintOutput(result) {
  const rawOutput = combineOutput(result.stdout, result.stderr);
  if (result.hasError) {
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Command failed.",
      rawOutput,
    };
  }

  const parsed = parseJsonOutput(result.stdout);
  if (!parsed) {
    if (rawOutput.length === 0) {
      return { errors: 0, warnings: 0, files: [], toolError: null, rawOutput };
    }
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Unable to parse HTMLHint output.",
      rawOutput,
    };
  }
  if (!Array.isArray(parsed)) {
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Unexpected HTMLHint output.",
      rawOutput,
    };
  }

  const files = [];
  let errors = 0;
  let warnings = 0;

  parsed.forEach((entry) => {
    const messageList = Array.isArray(entry.messages) ? entry.messages : [];
    if (messageList.length === 0) {
      return;
    }
    const messages = messageList.map((message) => {
      const severity =
        message.type === "warning" ? "warning" : "error";
      if (severity === "error") {
        errors += 1;
      } else {
        warnings += 1;
      }
      const ruleValue =
        message.rule && typeof message.rule === "object"
          ? message.rule.id
          : message.rule;
      return buildMessage({
        lineValue: message.line,
        columnValue: message.col || message.column,
        severityValue: severity,
        ruleValue: ruleValue || "",
        text: message.message || "",
      });
    });
    files.push({
      path: toRelativePath(entry.file),
      messages,
    });
  });

  return { errors, warnings, files, toolError: null, rawOutput };
}

/**
 * TypeScriptのエラー行を解析する。
 * @param {string} line 入力行。
 * @returns {any | null} 診断情報またはnull。
 */
function parseTscLine(line) {
  const matchParen = line.match(TSC_REGEX_PAREN);
  if (matchParen) {
    return {
      filePath: matchParen[1].trim(),
      line: Number.parseInt(matchParen[2], 10),
      column: Number.parseInt(matchParen[3], 10),
      severity: normalizeSeverity(matchParen[4]),
      rule: `TS${matchParen[5]}`,
      message: matchParen[6].trim(),
    };
  }

  const matchColon = line.match(TSC_REGEX_COLON);
  if (matchColon) {
    return {
      filePath: matchColon[1].trim(),
      line: Number.parseInt(matchColon[2], 10),
      column: Number.parseInt(matchColon[3], 10),
      severity: normalizeSeverity(matchColon[4]),
      rule: `TS${matchColon[5]}`,
      message: matchColon[6].trim(),
    };
  }

  const matchGlobal = line.match(TSC_REGEX_GLOBAL);
  if (matchGlobal) {
    return {
      filePath: "[tsc]",
      line: null,
      column: null,
      severity: normalizeSeverity(matchGlobal[1]),
      rule: `TS${matchGlobal[2]}`,
      message: matchGlobal[3].trim(),
    };
  }

  return null;
}

/**
 * TypeScriptの出力を解析する。
 * @param {any} result 実行結果。
 * @returns {any} 解析済みレポート。
 */
function parseTscOutput(result) {
  const rawOutput = combineOutput(result.stdout, result.stderr);
  if (result.hasError) {
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Command failed.",
      rawOutput,
    };
  }

  if (rawOutput.length === 0) {
    return { errors: 0, warnings: 0, files: [], toolError: null, rawOutput };
  }

  const lines = rawOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const diagnostics = [];

  lines.forEach((line) => {
    const parsed = parseTscLine(line);
    if (parsed) {
      diagnostics.push(parsed);
    }
  });

  if (diagnostics.length === 0) {
    return {
      errors: 0,
      warnings: 0,
      files: [],
      toolError: "Unable to parse TypeScript output.",
      rawOutput,
    };
  }

  let errors = 0;
  let warnings = 0;
  const fileMap = new Map();

  diagnostics.forEach((diagnostic) => {
    if (diagnostic.severity === "error") {
      errors += 1;
    } else {
      warnings += 1;
    }
    const filePathValue = toRelativePath(diagnostic.filePath);
    let entry = fileMap.get(filePathValue);
    if (!entry) {
      entry = { path: filePathValue, messages: [] };
      fileMap.set(filePathValue, entry);
    }
    entry.messages.push(
      buildMessage({
        lineValue: diagnostic.line,
        columnValue: diagnostic.column,
        severityValue: diagnostic.severity,
        ruleValue: diagnostic.rule,
        text: diagnostic.message,
      })
    );
  });

  return {
    errors,
    warnings,
    files: Array.from(fileMap.values()),
    toolError: null,
    rawOutput,
  };
}

/**
 * 実行コマンド文字列を組み立てる。
 * @param {string} command コマンド名。
 * @param {string[]} args 引数配列。
 * @returns {string} 表示用コマンド。
 */
function formatCommand(command, args) {
  return [command].concat(args).join(" ");
}

/**
 * ツール単位のレポートを作成する。
 * @param {string} name ツール名。
 * @param {any} result 実行結果。
 * @param {(result: any) => any} parser 解析関数。
 * @returns {any} ツールレポート。
 */
function buildToolReport(name, result, parser) {
  const parsed = parser(result);
  const status =
    parsed.toolError || parsed.errors > 0 || parsed.warnings > 0
      ? "fail"
      : "ok";
  return {
    name,
    command: formatCommand(result.command, result.args),
    status,
    errors: parsed.errors,
    warnings: parsed.warnings,
    files: parsed.files,
    toolError: parsed.toolError,
    rawOutput: parsed.rawOutput,
  };
}

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
    .map((message) => {
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

  if (tool.toolError) {
    const output = tool.rawOutput.length > 0 ? tool.rawOutput : tool.toolError;
    return `<section class="tool">
${header}
<div class="tool-error">${escapeHtml(tool.toolError)}</div>
<pre>${escapeHtml(output)}</pre>
</section>`;
  }

  if (tool.files.length === 0) {
    return `<section class="tool">
${header}
<p class="clean">No issues.</p>
</section>`;
  }

  const fileSections = tool.files
    .map((fileEntry) => {
      const hasError = fileEntry.messages.some(
        (message) => message.severity === "error"
      );
      return renderFileSection(fileEntry, hasError);
    })
    .join("");

  return `<section class="tool">
${header}
${fileSections}
</section>`;
}

/**
 * レポート全体のHTMLを生成する。
 * @param {any} reportData レポートデータ。
 * @returns {string} HTML文字列。
 */
function renderReport(reportData) {
  const summaryRows = reportData.tools
    .map((tool) => {
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
      :root {
        color-scheme: light;
      }
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: #f6f7fb;
        color: #1f2933;
        margin: 0;
        padding: 24px;
      }
      header {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px 24px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        margin-bottom: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 1.8rem;
      }
      .summary {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-top: 8px;
        font-weight: 600;
      }
      .summary span {
        background: #eef2ff;
        color: #3730a3;
        padding: 6px 12px;
        border-radius: 999px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95rem;
      }
      th,
      td {
        text-align: left;
        padding: 10px 12px;
        border-bottom: 1px solid #e5e7eb;
      }
      th {
        background: #f8fafc;
      }
      .status-ok td {
        color: #1b5e20;
      }
      .status-fail td {
        color: #b71c1c;
        font-weight: 600;
      }
      .tool {
        background: #ffffff;
        border-radius: 12px;
        padding: 20px 24px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        margin: 20px 0;
      }
      .tool-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .tool-header h2 {
        margin: 0;
        font-size: 1.4rem;
      }
      .tool-command {
        font-family: "Consolas", "Courier New", monospace;
        font-size: 0.85rem;
        color: #64748b;
        margin-top: 4px;
      }
      .tool-status {
        padding: 6px 12px;
        border-radius: 999px;
        font-weight: 700;
      }
      .tool-status.status-ok {
        background: #dcfce7;
        color: #166534;
      }
      .tool-status.status-fail {
        background: #fee2e2;
        color: #991b1b;
      }
      .tool-counts {
        margin: 12px 0 18px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-weight: 600;
      }
      .file-block {
        margin-bottom: 12px;
      }
      .file-block summary {
        cursor: pointer;
        font-weight: 600;
        padding: 6px 0;
      }
      .messages {
        margin-top: 8px;
      }
      .severity-error {
        color: #b91c1c;
      }
      .severity-warning {
        color: #b45309;
      }
      .tool-error {
        margin: 12px 0;
        color: #b91c1c;
        font-weight: 600;
      }
      .clean {
        color: #166534;
        font-weight: 600;
      }
      pre {
        background: #0f172a;
        color: #e2e8f0;
        padding: 12px;
        border-radius: 8px;
        overflow-x: auto;
        font-size: 0.85rem;
      }
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

/**
 * 各ツールを実行してレポートを生成する。
 */
function main() {
  const eslintResult = runCommand("eslint", [
    "--ext",
    ".js",
    ".",
    "-f",
    "json",
    "--max-warnings",
    "0",
  ]);
  const stylelintResult = runCommand("stylelint", [
    "**/*.css",
    "--formatter",
    "json",
    "--max-warnings",
    "0",
  ]);
  const htmlhintResult = runCommand("htmlhint", [
    "**/*.html",
    "--ignore",
    "**/reports/**,**/node_modules/**",
    "--format",
    "json",
  ]);
  const tscResult = runCommand("tsc", [
    "-p",
    "tsconfig.json",
    "--pretty",
    "false",
  ]);

  const tools = [
    buildToolReport("ESLint", eslintResult, parseEslintOutput),
    buildToolReport("Stylelint", stylelintResult, parseStylelintOutput),
    buildToolReport("HTMLHint", htmlhintResult, parseHtmlhintOutput),
    buildToolReport("TypeScript", tscResult, parseTscOutput),
  ];

  const totalErrors = tools.reduce(
    (sum, tool) => sum + tool.errors,
    0
  );
  const totalWarnings = tools.reduce(
    (sum, tool) => sum + tool.warnings,
    0
  );

  const reportData = {
    generatedAt: new Date().toISOString(),
    tools,
    totalErrors,
    totalWarnings,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, renderReport(reportData), "utf8");

  const relativeReportPath = path.relative(ROOT_DIR, REPORT_PATH);
  process.stdout.write(
    `Lint report written to ${relativeReportPath}\n`
  );
  process.stdout.write(`Errors: ${totalErrors}, Warnings: ${totalWarnings}\n`);

  const hasFailures = tools.some((tool) => tool.status === "fail");
  if (hasFailures) {
    process.stderr.write("Lint failed.\n");
    process.exitCode = 1;
    return;
  }
  process.exitCode = 0;
}

main();
