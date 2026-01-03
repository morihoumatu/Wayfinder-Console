/**
 * OpenAIクライアントの挙動を検証する。
 * @file
 */
const { EventEmitter } = require("events");
// httpsモジュールを読み込む。
const https = require("https");
// openai-clientからcallOpenAIを取得する。
const { callOpenAI } = require("../../server/openai-client");

// responseを作成する処理を定義する。
const createResponse = (statusCode, body) => {
  // EventEmitterのインスタンスを作成する。
  const response = new EventEmitter();
  response.statusCode = statusCode;
  response.emitBody = () => {
    response.emit("data", body);
    response.emit("end");
  };
  return response;
};

// requestを作成する処理を定義する。
const createRequest = (response, shouldError) => {
  // EventEmitterのインスタンスを作成する。
  const request = new EventEmitter();
  request.write = () => {};
  request.end = () => {
    if (shouldError) {
      request.emit("error", new Error("boom"));
      return;
    }
    response.emitBody();
  };
  return request;
};

// callOpenAIの挙動をまとめて検証する。
describe("callOpenAI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("レスポンスとエラー処理をまとめて確認する", async () => {
    // リクエストを取得する。
    const requestSpy = vi.spyOn(https, "request");

    requestSpy.mockImplementation((options, callback) => {
      // レスポンスを作成する。
      const response = createResponse(200, JSON.stringify({ ok: true }));
      // リクエストを作成する。
      const request = createRequest(response, false);
      callback(response);
      return request;
    });
    // successを取得する。
    const success = await callOpenAI({ input: "hello" });

    requestSpy.mockImplementation((options, callback) => {
      // レスポンスを作成する。
      const response = createResponse(
        400,
        JSON.stringify({ error: { message: "bad request" } })
      );
      // リクエストを作成する。
      const request = createRequest(response, false);
      callback(response);
      return request;
    });
    // エラーを取得する。
    const apiError = await callOpenAI({ input: "hello" })
      .then(() => null)
      .catch((error) => error.message);

    requestSpy.mockImplementation((options, callback) => {
      // レスポンスを作成する。
      const response = createResponse(200, JSON.stringify({ ok: true }));
      // リクエストを作成する。
      const request = createRequest(response, true);
      callback(response);
      return request;
    });
    // エラーを取得する。
    const connectionError = await callOpenAI({ input: "hello" })
      .then(() => null)
      .catch((error) => error.message);

    requestSpy.mockImplementation((options, callback) => {
      // レスポンスを作成する。
      const response = createResponse(200, "invalid");
      // リクエストを作成する。
      const request = createRequest(response, false);
      callback(response);
      return request;
    });
    // エラーを取得する。
    const parseError = await callOpenAI({ input: "hello" })
      .then(() => null)
      .catch((error) => error.message);

    requestSpy.mockImplementation((options, callback) => {
      // レスポンスを作成する。
      const response = createResponse(500, JSON.stringify({ error: {} }));
      // リクエストを作成する。
      const request = createRequest(response, false);
      callback(response);
      return request;
    });
    // エラーを取得する。
    const fallbackError = await callOpenAI({ input: "hello" })
      .then(() => null)
      .catch((error) => error.message);

    expect({
      success,
      apiError,
      connectionError,
      parseError,
      fallbackError,
    }).toEqual({
      success: { ok: true },
      apiError: "bad request",
      connectionError: "OpenAI API connection failed.",
      parseError: "OpenAI response parse error.",
      fallbackError: "OpenAI API request failed.",
    });
  });
});
