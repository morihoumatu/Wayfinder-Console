/**
 * サーバー設定の読み込みを検証する。
 * @file
 */
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../../server/config");
const envPath = path.join(__dirname, "../../.env");

const loadConfig = () => {
  delete require.cache[require.resolve(configPath)];
  return require(configPath);
};

const snapshotEnv = () => ({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_API_URL: process.env.OPENAI_API_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_WEB_SEARCH_TOOL: process.env.OPENAI_WEB_SEARCH_TOOL,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  MAPS_API_KEY: process.env.MAPS_API_KEY,
});

const restoreEnvValue = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

const restoreEnv = (snapshot) => {
  restoreEnvValue("NODE_ENV", snapshot.NODE_ENV);
  restoreEnvValue("PORT", snapshot.PORT);
  restoreEnvValue("OPENAI_API_KEY", snapshot.OPENAI_API_KEY);
  restoreEnvValue("OPENAI_API_URL", snapshot.OPENAI_API_URL);
  restoreEnvValue("OPENAI_MODEL", snapshot.OPENAI_MODEL);
  restoreEnvValue("OPENAI_WEB_SEARCH_TOOL", snapshot.OPENAI_WEB_SEARCH_TOOL);
  restoreEnvValue("GOOGLE_MAPS_API_KEY", snapshot.GOOGLE_MAPS_API_KEY);
  restoreEnvValue("MAPS_API_KEY", snapshot.MAPS_API_KEY);
};

const snapshotEnvFile = () =>
  fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : null;

const restoreEnvFile = (snapshot) => {
  if (snapshot === null) {
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }
  } else {
    fs.writeFileSync(envPath, snapshot, "utf8");
  }
};

const writeEnvFile = (content) => {
  fs.writeFileSync(envPath, content, "utf8");
};

describe("config", () => {
  const snapshot = snapshotEnv();
  const envSnapshot = snapshotEnvFile();

  afterEach(() => {
    restoreEnv(snapshot);
    restoreEnvFile(envSnapshot);
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

  it("ローカルの.envを読み込む", () => {
    process.env.NODE_ENV = "test";
    process.env.OPENAI_MODEL = "preset-model";
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_URL;
    delete process.env.OPENAI_WEB_SEARCH_TOOL;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.MAPS_API_KEY;
    writeEnvFile(
      [
        "# comment",
        "OPENAI_API_KEY=\"env-openai\"",
        "OPENAI_API_URL=https://env.example",
        "OPENAI_MODEL=\"env-model\"",
        "OPENAI_WEB_SEARCH_TOOL=web_search_preview",
        "GOOGLE_MAPS_API_KEY=env-maps",
        "MAPS_API_KEY=ignored-maps",
        "INVALID_LINE",
      ].join("\n")
    );
    const config = loadConfig();
    expect(config.OPENAI_API_KEY).toBe("env-openai");
    expect(config.OPENAI_API_URL).toBe("https://env.example");
    expect(config.OPENAI_MODEL).toBe("preset-model");
    expect(config.WEB_SEARCH_TOOL).toBe("web_search_preview");
    expect(config.MAPS_API_KEY).toBe("env-maps");
  });

  it("productionでは.envを読み込まない", () => {
    process.env.NODE_ENV = "production";
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.MAPS_API_KEY;
    writeEnvFile("GOOGLE_MAPS_API_KEY=env-maps");
    const config = loadConfig();
    expect(config.MAPS_API_KEY).toBe(undefined);
  });
});
