/**
 * OpenAIリクエスト構築の挙動を検証する。
 * @file
 */
const path = require("path");

// パスを組み立てる。
const configPath = path.join(__dirname, "../../server/config");
// パスを組み立てる。
const requestPath = path.join(__dirname, "../../server/openai-request");

// requestを取得する処理を定義する。
const loadRequest = () => {
  delete require.cache[require.resolve(configPath)];
  delete require.cache[require.resolve(requestPath)];
  return require(requestPath);
};

// resetEnvの処理を定義する。
const resetEnv = (snapshot) => {
  process.env.OPENAI_WEB_SEARCH_TOOL = snapshot.OPENAI_WEB_SEARCH_TOOL;
  process.env.OPENAI_MODEL = snapshot.OPENAI_MODEL;
};

// resolveToolsConfigの挙動をまとめて検証する。
describe("resolveToolsConfig", () => {
  // snapshotをまとめる。
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
    // resolveEnabledを読み込む。
    const { resolveToolsConfig: resolveEnabled } = loadRequest();
    // enabledを解決する。
    const enabled = resolveEnabled();

    resetEnv(snapshot);
    process.env.OPENAI_WEB_SEARCH_TOOL = "off";
    // resolveDisabledを読み込む。
    const { resolveToolsConfig: resolveDisabled } = loadRequest();
    // disabledを解決する。
    const disabled = resolveDisabled();

    expect({ enabled, disabled }).toEqual({
      enabled: [{ type: "web_search" }],
      disabled: undefined,
    });
  });
});

// buildOpenAIRequestPayloadの挙動をまとめて検証する。
describe("buildOpenAIRequestPayload", () => {
  // snapshotをまとめる。
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
    // リクエストを読み込む。
    const { buildOpenAIRequestPayload } = loadRequest();
    // ペイロードを作成する。
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
