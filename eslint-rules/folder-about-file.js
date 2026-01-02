/**
 * フォルダ説明ファイルの有無を検知するESLintルールを提供する。
 * @file フォルダ説明ファイルの有無を検知する。
 */
/* eslint-env node */
"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_ROOTS = ["app", "server", "scripts"];
const ABOUT_FILENAME = "ABOUT.md";
const IGNORE_DIRS = new Set(["node_modules", ".git", "reports"]);

let cachedCwd = null;
let cachedMissing = null;
let reportedOnce = false;

const shouldIgnoreDir = (dirName) => {
  return dirName.startsWith(".") || IGNORE_DIRS.has(dirName);
};

const readDirectory = (dirPath) => {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    entries = [];
  }
  return entries;
};

const collectDirectories = (rootPath) => {
  const collected = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    collected.push(current);
    const entries = readDirectory(current);
    entries.forEach((entry) => {
      if (entry.isDirectory() && !shouldIgnoreDir(entry.name)) {
        stack.push(path.join(current, entry.name));
      }
    });
  }
  return collected;
};

const resolveMissingAboutFiles = (cwd) => {
  /** @type {string[]} */
  const missing = [];

  DEFAULT_ROOTS.forEach((rootName) => {
    const rootPath = path.join(cwd, rootName);
    if (fs.existsSync(rootPath)) {
      const stat = fs.statSync(rootPath);
      if (stat.isDirectory()) {
        const dirs = collectDirectories(rootPath);
        dirs.forEach((dirPath) => {
          const aboutPath = path.join(dirPath, ABOUT_FILENAME);
          if (!fs.existsSync(aboutPath)) {
            missing.push(path.relative(cwd, dirPath));
          }
        });
      }
    }
  });

  return missing;
};

const getMissingDirectories = (cwd) => {
  if (cachedCwd !== cwd) {
    cachedCwd = cwd;
    cachedMissing = null;
    reportedOnce = false;
  }
  if (!cachedMissing) {
    cachedMissing = resolveMissingAboutFiles(cwd);
  }
  return cachedMissing;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require ABOUT.md in every directory under app/, server/, and scripts/.",
    },
    schema: [],
    messages: {
      missing: "Directory \"{{dir}}\" is missing ABOUT.md.",
    },
  },
  create(context) {
    const cwd =
      typeof context.getCwd === "function" ? context.getCwd() : process.cwd();

    const reportMissing = (node) => {
      if (reportedOnce) {
        return;
      }
      const missing = getMissingDirectories(cwd);
      missing.forEach((dir) => {
        context.report({
          node,
          messageId: "missing",
          data: { dir },
        });
      });
      reportedOnce = true;
    };

    return {
      Program: reportMissing,
    };
  },
};
