/**
 * サーバー設定の読み込みを検証する。
 * @file
 */
const fs = require("fs");
// pathモジュールを読み込む。
const path = require("path");

// パスを組み立てる。
const configPath = path.join(__dirname, "../../server/config");
// パスを組み立てる。
const envPath = path.join(__dirname, "../../.env");

// configを取得する処理を定義する。
const loadConfig = () => {
  delete require.cache[require.resolve(configPath)];
  return require(configPath);
};

// snapshotEnvの処理を定義する。
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

// restoreEnvValueの処理を定義する。
const restoreEnvValue = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

// restoreEnvの処理を定義する。
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

// snapshotEnvFileの処理を定義する。
const snapshotEnvFile = () =>
  fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : null;

// restoreEnvFileの処理を定義する。
const restoreEnvFile = (snapshot) => {
  if (snapshot === null) {
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }
  } else {
    fs.writeFileSync(envPath, snapshot, "utf8");
  }
};

// writeEnvFileの処理を定義する。
const writeEnvFile = (content) => {
  fs.writeFileSync(envPath, content, "utf8");
};

// configの読み込み条件をまとめて検証する。
describe("config", () => {
  // snapshotを取得する。
  const snapshot = snapshotEnv();
  // envSnapshotを取得する。
  const envSnapshot = snapshotEnvFile();

  afterEach(() => {
    restoreEnv(snapshot);
    restoreEnvFile(envSnapshot);
  });

  it("設定の読み込み結果をまとめて確認する", () => {
    restoreEnv(snapshot);
    restoreEnvFile(envSnapshot);
    delete process.env.OPENAI_API_URL;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_WEB_SEARCH_TOOL;
    // 設定を読み込む。
    const defaultConfig = loadConfig();

    restoreEnv(snapshot);
    restoreEnvFile(envSnapshot);
    process.env.PORT = "4000";
    process.env.OPENAI_API_URL = "https://example.test";
    process.env.OPENAI_MODEL = "test-model";
    process.env.OPENAI_WEB_SEARCH_TOOL = "off";
    // 設定を読み込む。
    const overrideConfig = loadConfig();

    restoreEnv(snapshot);
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
    // 設定を読み込む。
    const envConfig = loadConfig();

    restoreEnv(snapshot);
    process.env.NODE_ENV = "production";
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.MAPS_API_KEY;
    writeEnvFile("GOOGLE_MAPS_API_KEY=env-maps");
    // 設定を読み込む。
    const productionConfig = loadConfig();

    expect({
      defaults: {
        apiUrl: defaultConfig.OPENAI_API_URL,
        model: defaultConfig.OPENAI_MODEL,
        tool: defaultConfig.WEB_SEARCH_TOOL,
      },
      override: {
        port: overrideConfig.PORT,
        apiUrl: overrideConfig.OPENAI_API_URL,
        model: overrideConfig.OPENAI_MODEL,
        tool: overrideConfig.WEB_SEARCH_TOOL,
      },
      env: {
        apiKey: envConfig.OPENAI_API_KEY,
        apiUrl: envConfig.OPENAI_API_URL,
        model: envConfig.OPENAI_MODEL,
        tool: envConfig.WEB_SEARCH_TOOL,
        mapsKey: envConfig.MAPS_API_KEY,
      },
      production: {
        mapsKey: productionConfig.MAPS_API_KEY,
      },
    }).toEqual({
      defaults: {
        apiUrl: "https://api.openai.com/v1/responses",
        model: "gpt-4o-mini",
        tool: "web_search",
      },
      override: {
        port: 4000,
        apiUrl: "https://example.test",
        model: "test-model",
        tool: "off",
      },
      env: {
        apiKey: "env-openai",
        apiUrl: "https://env.example",
        model: "preset-model",
        tool: "web_search_preview",
        mapsKey: "env-maps",
      },
      production: {
        mapsKey: undefined,
      },
    });
  });
});
