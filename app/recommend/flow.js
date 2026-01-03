/**
 * おすすめ検索フローの状態管理をまとめる。
 * @file おすすめ検索フローの状態管理をまとめる。
 */
/* exported showRecommendResult, resolveRecommendationOrigin, resolveRecommendationRegion */
/* exported resolveRecommendationSelections, resolveOriginLabelValue, buildRecommendationPayload */
/* exported requestRecommendation */
/* global buildMapsLink: writable, getLatLngLiteral: writable, getMaxMinutes: writable */
/* global getSelectedRegionContext: writable, originLatLng: writable, originRegion: writable */
/* global recommendAddress: writable, recommendMapLink: writable, recommendReason: writable */
/* global recommendResult: writable, recommendTitle: writable, renderSources: writable, renderStops: writable */
/* global resolveLocalityCandidates: writable, resolveOriginRegion: writable */
/**
 * おすすめ結果をUIに表示する。
 * @param {any} place おすすめデータ。
 */
function showRecommendResult(place) {
  // 判定結果を条件で選ぶ。
  const isWalkRoute =
    place?.route_type === "walk_multi" || Array.isArray(place?.stops);
  recommendTitle.textContent =
    place?.name || (isWalkRoute ? "おすすめ散歩ルート" : "名称不明");
  recommendAddress.textContent =
    place?.address || place?.area || (isWalkRoute ? "出発地周辺" : "住所不明");
  recommendReason.textContent = place?.reason || "理由は取得できませんでした。";
  // マップを取得する。
  const mapQuery = [place?.name, place?.address, place?.area]
    .filter(Boolean)
    .join(" ");
  if (mapQuery) {
    recommendMapLink.href = buildMapsLink(mapQuery);
    recommendMapLink.hidden = false;
  } else {
    recommendMapLink.href = "#";
    recommendMapLink.hidden = true;
  }
  renderStops(isWalkRoute ? place?.stops : null);
  renderSources(place?.sources);
  recommendResult.hidden = false;
}

/**
 * おすすめ取得用の出発地情報を取得する。
 * @param {any} originOverride 出発地上書き。
 * @returns {any} 出発地情報。
 */
function resolveRecommendationOrigin(originOverride) {
  // originSourceを条件で選ぶ。
  const originSource = originOverride || originLatLng;
  // originLiteralを取得する。
  const originLiteral = getLatLngLiteral(originSource);
  if (!originLiteral) {
    throw new Error("出発地の座標が不正です。");
  }
  return { originSource, originLiteral };
}

/**
 * おすすめ取得の地域名を取得する。
 * @param {any} originSource 出発地座標。
 * @param {any} originRegionOverride 上書き地域。
 * @returns {Promise<string>} 地域名のPromise。
 */
async function resolveRecommendationRegion(originSource, originRegionOverride) {
  // regionを条件で選ぶ。
  let region =
    typeof originRegionOverride === "string" ? originRegionOverride.trim() : "";
  if (!region) {
    region = originRegion || (await resolveOriginRegion(originSource)) || "";
  }
  originRegion = region;
  return region;
}

/**
 * おすすめ取得の地域選択情報を取得する。
 * @param {any} context 地域コンテキスト。
 * @param {any} originPrefectures 都道府県配列。
 * @param {any} originAreaLabel 地方ラベル。
 * @returns {any} 選択結果。
 */
function resolveRecommendationSelections(
  context,
  originPrefectures,
  originAreaLabel
) {
  // selectedPrefecturesを条件で選ぶ。
  const selectedPrefectures =
    Array.isArray(originPrefectures) && originPrefectures.length > 0
      ? originPrefectures
      : Array.isArray(context?.prefectures)
        ? context.prefectures
        : [];
  // selectedAreaLabelを条件で選ぶ。
  const selectedAreaLabel =
    typeof originAreaLabel === "string" && originAreaLabel.trim()
      ? originAreaLabel.trim()
      : context?.label || "";
  return { selectedPrefectures, selectedAreaLabel };
}

/**
 * 出発地ラベルを取得する。
 * @param {any} originSource 出発地座標。
 * @param {string} region 地域名。
 * @returns {Promise<string>} ラベルのPromise。
 */
async function resolveOriginLabelValue(originSource, region) {
  // localitiesを解決する。
  const localities = await resolveLocalityCandidates(originSource);
  // originLabelValueを条件で選ぶ。
  const originLabelValue =
    (Array.isArray(localities) && localities[0]) || region || "";
  return originLabelValue;
}

/**
 * おすすめ取得のリクエストペイロードを作成する。
 * @param {any} options リクエストオプション。
 * @returns {Promise<any>} ペイロードのPromise。
 */
async function buildRecommendationPayload(
  /**
   * @type {{
   *   query?: any,
   *   mode?: any,
   *   targetMinutes?: any,
   *   adjustment?: any,
   *   actualMinutes?: any,
   *   originOverride?: any,
   *   originRegionOverride?: any,
   *   originPrefectures?: any,
   *   originAreaLabel?: any
   * }}
   */
  {
    query,
    mode,
    targetMinutes,
    adjustment,
    actualMinutes,
    originOverride,
    originRegionOverride,
    originPrefectures,
    originAreaLabel,
  }
) {
  // maxMinutesを取得する。
  const maxMinutes = getMaxMinutes();
  // originInfoを解決する。
  const originInfo = resolveRecommendationOrigin(originOverride);
  // regionを解決する。
  const region = await resolveRecommendationRegion(
    originInfo.originSource,
    originRegionOverride
  );
  // メッセージを取得する。
  const context = getSelectedRegionContext();
  // selectionを解決する。
  const selection = resolveRecommendationSelections(
    context,
    originPrefectures,
    originAreaLabel
  );
  // originLabelValueを解決する。
  const originLabelValue = await resolveOriginLabelValue(
    originInfo.originSource,
    region
  );
  return {
    query,
    origin: {
      lat: originInfo.originLiteral.lat,
      lng: originInfo.originLiteral.lng,
    },
    originLabel: originLabelValue,
    originAreaLabel: selection.selectedAreaLabel,
    originPrefectures: selection.selectedPrefectures,
    maxMinutes,
    targetMinutes,
    mode,
    adjustment,
    actualMinutes,
    originRegion: region,
  };
}

/**
 * おすすめ取得APIを呼び出す。
 * @param {{
 *   query?: any,
 *   mode?: any,
 *   targetMinutes?: any,
 *   adjustment?: any,
 *   actualMinutes?: any,
 *   originOverride?: any,
 *   originRegionOverride?: any,
 *   originPrefectures?: any,
 *   originAreaLabel?: any
 * }} options リクエストオプション。
 * @returns {Promise<any>} APIレスポンスのPromise。
 */
async function requestRecommendation(
  /**
   * @type {{
   *   query?: any,
   *   mode?: any,
   *   targetMinutes?: any,
   *   adjustment?: any,
   *   actualMinutes?: any,
   *   originOverride?: any,
   *   originRegionOverride?: any,
   *   originPrefectures?: any,
   *   originAreaLabel?: any
   * }}
   */
  {
    query,
    mode,
    targetMinutes,
    adjustment,
    actualMinutes,
    originOverride,
    originRegionOverride,
  originPrefectures,
  originAreaLabel,
  }
) {
  // ペイロードを作成する。
  const payload = await buildRecommendationPayload({
    query,
    mode,
    targetMinutes,
    adjustment,
    actualMinutes,
    originOverride,
    originRegionOverride,
    originPrefectures,
    originAreaLabel,
  });
  // レスポンスを取得する。
  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // データを取得する。
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "おすすめ地点の取得に失敗しました。");
  }
  return data;
}