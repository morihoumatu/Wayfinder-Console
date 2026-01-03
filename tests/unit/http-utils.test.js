/**
 * HTTPユーティリティの基本動作を検証する。
 * @file
 */
const { EventEmitter } = require("events");
// pathモジュールを読み込む。
const path = require("path");
// http-utilsから必要な値を取得する。
const { safeJoin, readJson, sendJson, SECURITY_HEADERS } = require("../../server/http-utils");

// requestを作成する処理を定義する。
const createRequest = () => {
  // EventEmitterのインスタンスを作成する。
  const req = new EventEmitter();
  req.destroy = () => {};
  return req;
};

// emitRequestの処理を定義する。
const emitRequest = (req, chunks) => {
  chunks.forEach((chunk) => {
    req.emit("data", chunk);
  });
  req.emit("end");
};

// errorMessageを読み取る処理を定義する。
const readErrorMessage = async (promise) => {
  // メッセージの初期値を定義する。
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
    // パスを組み立てる。
    const base = path.resolve("root");
    // IDを取得する。
    const inside = safeJoin(base, "child/file.txt");
    // IDを取得する。
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
    // emptyReqを作成する。
    const emptyReq = createRequest();
    // emptyPromiseを読み込む。
    const emptyPromise = readJson(emptyReq);
    emitRequest(emptyReq, []);
    // 結果を取得する。
    const emptyResult = await emptyPromise;

    // jsonReqを作成する。
    const jsonReq = createRequest();
    // jsonPromiseを読み込む。
    const jsonPromise = readJson(jsonReq);
    emitRequest(jsonReq, ['{"ok":true}']);
    // 結果を取得する。
    const jsonResult = await jsonPromise;

    // IDを作成する。
    const invalidReq = createRequest();
    // IDを読み込む。
    const invalidPromise = readJson(invalidReq);
    emitRequest(invalidReq, ["{oops"]);
    // メッセージを読み込む。
    const invalidMessage = await readErrorMessage(invalidPromise);

    // largeReqを作成する。
    const largeReq = createRequest();
    largeReq.destroy = vi.fn();
    // largePromiseを読み込む。
    const largePromise = readJson(largeReq);
    largeReq.emit("data", "a".repeat(1_000_001));
    // メッセージを読み込む。
    const largeMessage = await readErrorMessage(largePromise);
    // destroyCalledを用意する。
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
    // resをまとめる。
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    // ペイロードをまとめる。
    const payload = { ok: true };
    sendJson(res, 201, payload);
    // writeHeadArgsの参照を保持する。
    const writeHeadArgs = res.writeHead.mock.calls[0];
    // endArgsの参照を保持する。
    const endArgs = res.end.mock.calls[0];
    // expectedHeadersをまとめる。
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
