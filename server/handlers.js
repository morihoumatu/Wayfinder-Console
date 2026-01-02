const { extractOutputText, parseJsonFromText } = require("./json-utils");
const { extractStopsFromResult } = require("./stop-utils");
const {
  parseRecommendPayload,
  validateRecommendRequest,
  buildWalkRouteMetrics,
  normalizePrefectureList,
  buildPrefectureHint,
  buildSearchRegion,
} = require("./recommend-utils");
const {
  buildWalkRouteSystemPrompt,
  buildSpotSystemPrompt,
  buildWalkRouteUserContent,
  buildSpotUserContent,
} = require("./prompts");
const { buildOpenAIRequestPayload } = require("./openai-request");
const { callOpenAI } = require("./openai-client");

/**
 * 散歩ルートのレスポンスを送信する。
 * @param {any} options 送信オプション。
 */
function handleWalkRouteResult(
  /**
   * @type {{
   *   result: any,
   *   originRegion: string,
   *   effectiveTargetMinutes: number,
   *   outputText: string,
   *   sendOnce: any
   * }}
   */
  { result, originRegion, effectiveTargetMinutes, outputText, sendOnce }
) {
  const stops = extractStopsFromResult(result);
  if (stops.length < 2) {
    console.error("OpenAI raw output:", outputText);
    sendOnce(500, { error: "散歩ルートの地点が取得できませんでした。" });
  } else {
    const parsedTargetMinutes = Number.parseInt(result.target_minutes, 10);
    const targetMinutes =
      Number.isFinite(parsedTargetMinutes) && parsedTargetMinutes > 0
        ? parsedTargetMinutes
        : effectiveTargetMinutes;
    sendOnce(200, {
      place: {
        route_type: "walk_multi",
        name: result.route_name || "おすすめ散歩ルート",
        area: result.area || originRegion || "",
        reason: result.reason,
        target_minutes: targetMinutes,
        stops,
        sources: Array.isArray(result.source_urls) ? result.source_urls : [],
      },
    });
  }
}

/**
 * スポットのレスポンスを送信する。
 * @param {any} result 解析結果。
 * @param {any} sendOnce 応答関数。
 */
function handleSpotResult(result, sendOnce) {
  sendOnce(200, {
    place: {
      name: result.place_name,
      address: result.place_address,
      reason: result.reason,
      sources: Array.isArray(result.source_urls) ? result.source_urls : [],
    },
  });
}

/**
 * 解析結果を処理して応答する。
 * @param {any} options 処理オプション。
 */
function handleRecommendResult(
  /**
   * @type {{
   *   outputText: string,
   *   isWalkRoute: boolean,
   *   originRegion: string,
   *   effectiveTargetMinutes: number,
   *   sendOnce: any
   * }}
   */
  { outputText, isWalkRoute, originRegion, effectiveTargetMinutes, sendOnce }
) {
  const result = parseJsonFromText(outputText);
  if (!result) {
    console.error("OpenAI raw output:", outputText);
    sendOnce(500, { error: "おすすめ地点の解析に失敗しました。" });
  } else if (result.error) {
    sendOnce(500, { error: result.error });
  } else if (isWalkRoute) {
    handleWalkRouteResult({
      result,
      originRegion,
      effectiveTargetMinutes,
      outputText,
      sendOnce,
    });
  } else {
    handleSpotResult(result, sendOnce);
  }
}

/**
 * おすすめAPIの処理を実行する。
 * @param {any} payload 入力データ。
 * @param {any} sendOnce 応答関数。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function handleRecommendPayload(payload, sendOnce) {
  const context = parseRecommendPayload(payload);
  const isValid = validateRecommendRequest(context, sendOnce);
  if (isValid) {
    const metrics = buildWalkRouteMetrics(context);
    const isWalkRoute = context.mode === "walk_route";
    const prefectureList = normalizePrefectureList(context.originPrefectures);
    const prefectureHint = buildPrefectureHint(prefectureList);
    const searchRegion = buildSearchRegion(
      context.originRegion,
      isWalkRoute,
      metrics.effectiveTargetMinutes
    );
    const promptContext = {
      ...context,
      ...metrics,
      isWalkRoute,
      prefectureHint,
      searchRegion,
    };
    const systemPrompt = isWalkRoute
      ? buildWalkRouteSystemPrompt(promptContext)
      : buildSpotSystemPrompt();
    const userContent = isWalkRoute
      ? buildWalkRouteUserContent(promptContext)
      : buildSpotUserContent(promptContext);
    const requestPayload = buildOpenAIRequestPayload(systemPrompt, userContent);
    const response = await callOpenAI(requestPayload);
    const outputText = extractOutputText(response);
    handleRecommendResult({
      outputText,
      isWalkRoute,
      originRegion: context.originRegion,
      effectiveTargetMinutes: metrics.effectiveTargetMinutes,
      sendOnce,
    });
  }
}

module.exports = {
  handleWalkRouteResult,
  handleSpotResult,
  handleRecommendResult,
  handleRecommendPayload,
};
