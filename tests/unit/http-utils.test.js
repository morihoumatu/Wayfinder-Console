/**
 * HTTPユーティリティの基本動作を検証する。
 * @file
 */
const { EventEmitter } = require("events");
const path = require("path");
const { safeJoin, readJson, sendJson, SECURITY_HEADERS } = require("../../server/http-utils");

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

  it("サイズ超過の本文はエラーになる", async () => {
    const req = createRequest();
    req.destroy = vi.fn();
    const promise = readJson(req);
    req.emit("data", "a".repeat(1_000_001));
    await expect(promise).rejects.toThrow("Request body too large.");
    expect(req.destroy).toHaveBeenCalled();
  });
});

describe("sendJson", () => {
  it("JSONレスポンスとセキュリティヘッダーを送信する", () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    const payload = { ok: true };
    sendJson(res, 201, payload);
    expect(res.writeHead).toHaveBeenCalledWith(
      201,
      expect.objectContaining({
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": SECURITY_HEADERS["X-Content-Type-Options"],
        "X-Frame-Options": SECURITY_HEADERS["X-Frame-Options"],
      })
    );
    expect(res.end).toHaveBeenCalledWith(JSON.stringify(payload));
  });
});
