/**
 * OpenAIクライアントの挙動を検証する。
 * @file
 */
const { EventEmitter } = require("events");
const https = require("https");
const { callOpenAI } = require("../../server/openai-client");

const createResponse = (statusCode, body) => {
  const response = new EventEmitter();
  response.statusCode = statusCode;
  response.emitBody = () => {
    response.emit("data", body);
    response.emit("end");
  };
  return response;
};

const createRequest = (response, shouldError) => {
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
    const requestSpy = vi.spyOn(https, "request");

    requestSpy.mockImplementation((options, callback) => {
      const response = createResponse(200, JSON.stringify({ ok: true }));
      const request = createRequest(response, false);
      callback(response);
      return request;
    });
    const success = await callOpenAI({ input: "hello" });

    requestSpy.mockImplementation((options, callback) => {
      const response = createResponse(
        400,
        JSON.stringify({ error: { message: "bad request" } })
      );
      const request = createRequest(response, false);
      callback(response);
      return request;
    });
    const apiError = await callOpenAI({ input: "hello" })
      .then(() => null)
      .catch((error) => error.message);

    requestSpy.mockImplementation((options, callback) => {
      const response = createResponse(200, JSON.stringify({ ok: true }));
      const request = createRequest(response, true);
      callback(response);
      return request;
    });
    const connectionError = await callOpenAI({ input: "hello" })
      .then(() => null)
      .catch((error) => error.message);

    requestSpy.mockImplementation((options, callback) => {
      const response = createResponse(200, "invalid");
      const request = createRequest(response, false);
      callback(response);
      return request;
    });
    const parseError = await callOpenAI({ input: "hello" })
      .then(() => null)
      .catch((error) => error.message);

    requestSpy.mockImplementation((options, callback) => {
      const response = createResponse(500, JSON.stringify({ error: {} }));
      const request = createRequest(response, false);
      callback(response);
      return request;
    });
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
