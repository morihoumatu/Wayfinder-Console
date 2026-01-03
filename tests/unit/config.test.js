/**
 * サーバー設定の読み込みを検証する。
 * @file
 */
const path = require("path");

const configPath = path.join(__dirname, "../../server/config");

const loadConfig = () => {
  delete require.cache[require.resolve(configPath)];
  return require(configPath);
};

const snapshotEnv = () => ({
  PORT: process.env.PORT,
  OPENAI_API_URL: process.env.OPENAI_API_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_WEB_SEARCH_TOOL: process.env.OPENAI_WEB_SEARCH_TOOL,
});

const restoreEnv = (snapshot) => {
  process.env.PORT = snapshot.PORT;
  process.env.OPENAI_API_URL = snapshot.OPENAI_API_URL;
  process.env.OPENAI_MODEL = snapshot.OPENAI_MODEL;
  process.env.OPENAI_WEB_SEARCH_TOOL = snapshot.OPENAI_WEB_SEARCH_TOOL;
};

describe("config", () => {
  const snapshot = snapshotEnv();

  afterEach(() => {
    restoreEnv(snapshot);
  });

  it("デフォルト設定を読み込む", () => {
    delete process.env.OPENAI_API_URL;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_WEB_SEARCH_TOOL;
    const config = loadConfig();
    expect(config.OPENAI_API_URL).toBe("https://api.openai.com/v1/responses");
    expect(config.OPENAI_MODEL).toBe("gpt-4o-mini");
    expect(config.WEB_SEARCH_TOOL).toBe("web_search");
  });

  it("環境変数で上書きする", () => {
    process.env.PORT = "4000";
    process.env.OPENAI_API_URL = "https://example.test";
    process.env.OPENAI_MODEL = "test-model";
    process.env.OPENAI_WEB_SEARCH_TOOL = "off";
    const config = loadConfig();
    expect(config.PORT).toBe(4000);
    expect(config.OPENAI_API_URL).toBe("https://example.test");
    expect(config.OPENAI_MODEL).toBe("test-model");
    expect(config.WEB_SEARCH_TOOL).toBe("off");
  });
});
