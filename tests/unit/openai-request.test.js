/**
 * OpenAIリクエスト構築の挙動を検証する。
 * @file
 */
const path = require("path");

const configPath = path.join(__dirname, "../../server/config");
const requestPath = path.join(__dirname, "../../server/openai-request");

const loadRequest = () => {
  delete require.cache[require.resolve(configPath)];
  delete require.cache[require.resolve(requestPath)];
  return require(requestPath);
};

const resetEnv = (snapshot) => {
  process.env.OPENAI_WEB_SEARCH_TOOL = snapshot.OPENAI_WEB_SEARCH_TOOL;
  process.env.OPENAI_MODEL = snapshot.OPENAI_MODEL;
};

// resolveToolsConfigの挙動をまとめて検証する。
describe("resolveToolsConfig", () => {
  const snapshot = {
    OPENAI_WEB_SEARCH_TOOL: process.env.OPENAI_WEB_SEARCH_TOOL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };

  afterEach(() => {
    resetEnv(snapshot);
  });

  it("ツール設定の有効/無効をまとめて確認する", () => {
    resetEnv(snapshot);
    process.env.OPENAI_WEB_SEARCH_TOOL = "web_search";
    const { resolveToolsConfig: resolveEnabled } = loadRequest();
    const enabled = resolveEnabled();

    resetEnv(snapshot);
    process.env.OPENAI_WEB_SEARCH_TOOL = "off";
    const { resolveToolsConfig: resolveDisabled } = loadRequest();
    const disabled = resolveDisabled();

    expect({ enabled, disabled }).toEqual({
      enabled: [{ type: "web_search" }],
      disabled: undefined,
    });
  });
});

// buildOpenAIRequestPayloadの挙動をまとめて検証する。
describe("buildOpenAIRequestPayload", () => {
  const snapshot = {
    OPENAI_WEB_SEARCH_TOOL: process.env.OPENAI_WEB_SEARCH_TOOL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };

  afterEach(() => {
    resetEnv(snapshot);
  });

  it("ツール未使用時のpayloadをまとめて確認する", () => {
    resetEnv(snapshot);
    process.env.OPENAI_WEB_SEARCH_TOOL = "off";
    process.env.OPENAI_MODEL = "test-model";
    const { buildOpenAIRequestPayload } = loadRequest();
    const payload = buildOpenAIRequestPayload("system", "user");
    expect({
      model: payload.model,
      format: payload.text?.format?.type,
    }).toEqual({
      model: "test-model",
      format: "json_object",
    });
  });
});
