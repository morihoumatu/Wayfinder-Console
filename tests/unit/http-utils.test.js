/**
 * HTTPユーティリティの基本動作を検証する。
 * @file
 */
const { EventEmitter } = require("events");
const path = require("path");
const { describe, it, expect } = require("vitest");
const { safeJoin, readJson } = require("../../server/http-utils");

const createRequest = () => {
  const req = new EventEmitter();
  req.destroy = () => {};
  return req;
};

const emitRequest = (req, chunks) => {
  chunks.forEach((chunk) => {
    req.emit("data", chunk);
  });
  req.emit("end");
};

describe("safeJoin", () => {
  it("base配下のパスを正規化して返す", () => {
    const base = path.resolve("root");
    const result = safeJoin(base, "child/file.txt");
    expect(result).toBe(path.join(base, "child", "file.txt"));
  });

  it("baseの外に出る場合はnullを返す", () => {
    const base = path.resolve("root");
    const result = safeJoin(base, "..");
    expect(result).toBe(null);
  });
});

describe("readJson", () => {
  it("空ボディは空オブジェクトで解決する", async () => {
    const req = createRequest();
    const promise = readJson(req);
    emitRequest(req, []);
    const result = await promise;
    expect(result).toEqual({});
  });

  it("JSONを解析して返す", async () => {
    const req = createRequest();
    const promise = readJson(req);
    emitRequest(req, ['{"ok":true}']);
    const result = await promise;
    expect(result).toEqual({ ok: true });
  });

  it("不正JSONはエラーになる", async () => {
    const req = createRequest();
    const promise = readJson(req);
    emitRequest(req, ["{oops"]);
    await expect(promise).rejects.toThrow("Invalid JSON.");
  });
});
