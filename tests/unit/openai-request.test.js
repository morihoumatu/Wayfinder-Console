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

describe("resolveToolsConfig", () => {
  const snapshot = {
    OPENAI_WEB_SEARCH_TOOL: process.env.OPENAI_WEB_SEARCH_TOOL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };

  afterEach(() => {
    resetEnv(snapshot);
  });

  it("ツール設定が有効な場合は配列を返す", () => {
    process.env.OPENAI_WEB_SEARCH_TOOL = "web_search";
    const { resolveToolsConfig } = loadRequest();
    expect(resolveToolsConfig()).toEqual([{ type: "web_search" }]);
  });

  it("ツールがoffならundefinedを返す", () => {
    process.env.OPENAI_WEB_SEARCH_TOOL = "off";
    const { resolveToolsConfig } = loadRequest();
    expect(resolveToolsConfig()).toBe(undefined);
  });
});

describe("buildOpenAIRequestPayload", () => {
  const snapshot = {
    OPENAI_WEB_SEARCH_TOOL: process.env.OPENAI_WEB_SEARCH_TOOL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };

  afterEach(() => {
    resetEnv(snapshot);
  });

  it("ツール未使用時はJSON形式指定を追加する", () => {
    process.env.OPENAI_WEB_SEARCH_TOOL = "off";
    process.env.OPENAI_MODEL = "test-model";
    const { buildOpenAIRequestPayload } = loadRequest();
    const payload = buildOpenAIRequestPayload("system", "user");
    expect(payload.model).toBe("test-model");
    expect(payload.text?.format?.type).toBe("json_object");
  });
});
