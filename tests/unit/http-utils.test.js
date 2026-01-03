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

const readErrorMessage = async (promise) => {
  let message = null;
  try {
    await promise;
  } catch (error) {
    message = error.message;
  }
  return message;
};

// safeJoinの挙動をまとめて検証する。
describe("safeJoin", () => {
  it("安全なパス解決をまとめて確認する", () => {
    const base = path.resolve("root");
    const inside = safeJoin(base, "child/file.txt");
    const outside = safeJoin(base, "..");
    expect({ inside, outside }).toEqual({
      inside: path.join(base, "child", "file.txt"),
      outside: null,
    });
  });
});

// readJsonの挙動をまとめて検証する。
describe("readJson", () => {
  it("本文読み取りの結果をまとめて確認する", async () => {
    const emptyReq = createRequest();
    const emptyPromise = readJson(emptyReq);
    emitRequest(emptyReq, []);
    const emptyResult = await emptyPromise;

    const jsonReq = createRequest();
    const jsonPromise = readJson(jsonReq);
    emitRequest(jsonReq, ['{"ok":true}']);
    const jsonResult = await jsonPromise;

    const invalidReq = createRequest();
    const invalidPromise = readJson(invalidReq);
    emitRequest(invalidReq, ["{oops"]);
    const invalidMessage = await readErrorMessage(invalidPromise);

    const largeReq = createRequest();
    largeReq.destroy = vi.fn();
    const largePromise = readJson(largeReq);
    largeReq.emit("data", "a".repeat(1_000_001));
    const largeMessage = await readErrorMessage(largePromise);
    const destroyCalled = largeReq.destroy.mock.calls.length > 0;

    expect({
      emptyResult,
      jsonResult,
      invalidMessage,
      largeMessage,
      destroyCalled,
    }).toEqual({
      emptyResult: {},
      jsonResult: { ok: true },
      invalidMessage: "Invalid JSON.",
      largeMessage: "Request body too large.",
      destroyCalled: true,
    });
  });
});

// sendJsonの挙動をまとめて検証する。
describe("sendJson", () => {
  it("JSONレスポンスとヘッダーをまとめて確認する", () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    const payload = { ok: true };
    sendJson(res, 201, payload);
    const writeHeadArgs = res.writeHead.mock.calls[0];
    const endArgs = res.end.mock.calls[0];
    const expectedHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
    };
    expect({
      status: writeHeadArgs[0],
      headers: writeHeadArgs[1],
      body: endArgs[0],
    }).toEqual({
      status: 201,
      headers: expectedHeaders,
      body: JSON.stringify(payload),
    });
  });
});
