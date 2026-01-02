const { OPENAI_MODEL, WEB_SEARCH_TOOL } = require("./config");

/**
 * 利用ツール設定を解決する。
 * @returns {any[] | undefined} ツール設定。
 */
function resolveToolsConfig() {
  return WEB_SEARCH_TOOL && WEB_SEARCH_TOOL !== "off"
    ? [{ type: WEB_SEARCH_TOOL }]
    : undefined;
}

/**
 * OpenAIリクエストを作成する。
 * @param {string} systemPrompt システムプロンプト。
 * @param {string} userContent ユーザー入力。
 * @returns {any} リクエストペイロード。
 */
function buildOpenAIRequestPayload(systemPrompt, userContent) {
  const input = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
  const tools = resolveToolsConfig();
  /**
   * @type {{
   *   model: string,
   *   input: any[],
   *   tools: any[] | undefined,
   *   temperature: number,
   *   text?: { format: { type: string } }
   * }}
   */
  const requestPayload = {
    model: OPENAI_MODEL,
    input,
    tools,
    temperature: 0.2,
  };
  if (!tools) {
    requestPayload.text = { format: { type: "json_object" } };
  }
  return requestPayload;
}

module.exports = {
  resolveToolsConfig,
  buildOpenAIRequestPayload,
};
