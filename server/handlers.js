/**
 * APIハンドラーの処理をまとめる。
 * @file APIハンドラーの処理をまとめる。
 */
const { extractOutputText, parseJsonFromText } = require("./json-utils");
// stop-utilsからextractStopsFromResultを取得する。
const { extractStopsFromResult } = require("./stop-utils");
// recommend-utilsから必要な値を取得する。
const {
  parseRecommendPayload,
  validateRecommendRequest,
  buildWalkRouteMetrics,
  normalizePrefectureList,
  buildPrefectureHint,
  buildSearchRegion,
} = require("./recommend-utils");
// promptsから必要な値を取得する。
const {
  buildWalkRouteSystemPrompt,
  buildSpotSystemPrompt,
  buildWalkRouteUserContent,
  buildSpotUserContent,
} = require("./prompts");
// openai-requestからbuildOpenAIRequestPayloadを取得する。
const { buildOpenAIRequestPayload } = require("./openai-request");
// openai-clientからcallOpenAIを取得する。
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
  // stopsを取得する。
  const stops = extractStopsFromResult(result);
  if (stops.length < 2) {
    console.error("OpenAI raw output:", outputText);
    sendOnce(500, { error: "散歩ルートの地点が取得できませんでした。" });
  } else {
    // parsedTargetMinutesを解析する。
    const parsedTargetMinutes = Number.parseInt(result.target_minutes, 10);
    // targetMinutesを条件で選ぶ。
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
  // 結果を解析する。
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
  // メッセージを解析する。
  const context = parseRecommendPayload(payload);
  // 判定結果を取得する。
  const isValid = validateRecommendRequest(context, sendOnce);
  if (isValid) {
    // metricsを作成する。
    const metrics = buildWalkRouteMetrics(context);
    // 判定結果を用意する。
    const isWalkRoute = context.mode === "walk_route";
    // 一覧を正規化する。
    const prefectureList = normalizePrefectureList(context.originPrefectures);
    // prefectureHintを作成する。
    const prefectureHint = buildPrefectureHint(prefectureList);
    // searchRegionを作成する。
    const searchRegion = buildSearchRegion(
      context.originRegion,
      isWalkRoute,
      metrics.effectiveTargetMinutes
    );
    // メッセージをまとめる。
    const promptContext = {
      ...context,
      ...metrics,
      isWalkRoute,
      prefectureHint,
      searchRegion,
    };
    // systemPromptを条件で選ぶ。
    const systemPrompt = isWalkRoute
      ? buildWalkRouteSystemPrompt(promptContext)
      : buildSpotSystemPrompt();
    // userContentを条件で選ぶ。
    const userContent = isWalkRoute
      ? buildWalkRouteUserContent(promptContext)
      : buildSpotUserContent(promptContext);
    // リクエストを作成する。
    const requestPayload = buildOpenAIRequestPayload(systemPrompt, userContent);
    // レスポンスを取得する。
    const response = await callOpenAI(requestPayload);
    // メッセージを取得する。
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
