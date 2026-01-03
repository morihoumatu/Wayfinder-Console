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

describe("callOpenAI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常レスポンスを返す", async () => {
    vi.spyOn(https, "request").mockImplementation((options, callback) => {
      const response = createResponse(200, JSON.stringify({ ok: true }));
      const request = createRequest(response, false);
      callback(response);
      return request;
    });

    const result = await callOpenAI({ input: "hello" });
    expect(result).toEqual({ ok: true });
  });

  it("APIエラーはメッセージを返す", async () => {
    vi.spyOn(https, "request").mockImplementation((options, callback) => {
      const response = createResponse(
        400,
        JSON.stringify({ error: { message: "bad request" } })
      );
      const request = createRequest(response, false);
      callback(response);
      return request;
    });

    await expect(callOpenAI({ input: "hello" })).rejects.toThrow("bad request");
  });

  it("接続エラーは例外になる", async () => {
    vi.spyOn(https, "request").mockImplementation((options, callback) => {
      const response = createResponse(200, JSON.stringify({ ok: true }));
      const request = createRequest(response, true);
      callback(response);
      return request;
    });

    await expect(callOpenAI({ input: "hello" })).rejects.toThrow(
      "OpenAI API connection failed."
    );
  });
});
