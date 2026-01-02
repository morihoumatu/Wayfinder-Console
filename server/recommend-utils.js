/**
 * おすすめ検索の補助処理をまとめる。
 * @file おすすめ検索の補助処理をまとめる。
 */
const { DEFAULT_WALK_TARGET_MINUTES } = require("./config");

/**
 * 地域名から都道府県を抽出する。
 * @param {string} region 地域名。
 * @returns {string} 都道府県名。
 */
function extractPrefecture(region) {
  let extracted = "";
  if (region) {
    const match = region.match(/^(.+?[都道府県])/);
    extracted = match && typeof match[1] === "string" ? match[1] : region;
  }
  return extracted;
}

/**
 * 文字列を正規化する。
 * @param {any} value 入力値。
 * @returns {string} 正規化文字列。
 */
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 調整指示を正規化する。
 * @param {any} value 入力値。
 * @returns {string} 調整指示。
 */
function normalizeAdjustment(value) {
  return value === "longer" || value === "shorter" ? value : "";
}

/**
 * 文字列配列を正規化する。
 * @param {any} value 入力値。
 * @returns {string[]} 正規化配列。
 */
function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.filter((/** @type {string} */ entry) => typeof entry === "string")
    : [];
}

/**
 * おすすめAPI入力を解析する。
 * @param {any} payload 入力データ。
 * @returns {any} 解析結果。
 */
function parseRecommendPayload(payload) {
  return {
    query: normalizeText(payload?.query),
    mode: payload?.mode === "walk_route" ? "walk_route" : "spot",
    origin: payload?.origin,
    maxMinutes: Number.parseInt(payload?.maxMinutes, 10),
    targetMinutes: Number.parseInt(payload?.targetMinutes, 10),
    adjustment: normalizeAdjustment(payload?.adjustment),
    actualMinutes: Number.parseInt(payload?.actualMinutes, 10),
    originRegion: normalizeText(payload?.originRegion),
    originLabel: normalizeText(payload?.originLabel),
    originAreaLabel: normalizeText(payload?.originAreaLabel),
    originPrefectures: normalizeStringArray(payload?.originPrefectures),
  };
}

/**
 * おすすめAPI入力を検証する。
 * @param {any} context 解析結果。
 * @param {any} sendOnce 応答関数。
 * @returns {boolean} 検証結果。
 */
function validateRecommendRequest(context, sendOnce) {
  let isValid = true;
  if (!context.query && context.mode !== "walk_route") {
    sendOnce(400, { error: "検索キーワードが空です。" });
    isValid = false;
  }
  if (isValid) {
    const origin = context.origin;
    if (!origin || typeof origin.lat !== "number" || typeof origin.lng !== "number") {
      sendOnce(400, { error: "出発地の座標が不正です。" });
      isValid = false;
    }
  }
  return isValid;
}

/**
 * 目標所要時間の基準を決定する。
 * @param {number} maxMinutes 上限分数。
 * @param {number} targetMinutes 目標分数。
 * @returns {any} 算出結果。
 */
function resolveEffectiveTargetMinutes(maxMinutes, targetMinutes) {
  const hasMaxMinutes = Number.isFinite(maxMinutes) && maxMinutes > 0;
  const hasTargetMinutes = Number.isFinite(targetMinutes) && targetMinutes > 0;
  const effectiveTargetMinutes = hasTargetMinutes
    ? targetMinutes
    : hasMaxMinutes
      ? maxMinutes
      : DEFAULT_WALK_TARGET_MINUTES;
  return { hasMaxMinutes, hasTargetMinutes, effectiveTargetMinutes };
}

/**
 * 散歩ルートの区間レンジを算出する。
 * @param {number} effectiveTargetMinutes 目標分数。
 * @returns {any} 算出結果。
 */
function buildSegmentRange(effectiveTargetMinutes) {
  const desiredStops = Math.min(
    6,
    Math.max(3, Math.round(effectiveTargetMinutes / 45) + 2)
  );
  const segmentMinutes = Math.max(
    15,
    Math.round(effectiveTargetMinutes / (desiredStops + 1))
  );
  const segmentRange = `${Math.max(
    10,
    Math.round(segmentMinutes * 0.7)
  )}〜${Math.round(segmentMinutes * 1.3)}`;
  return { desiredStops, segmentRange };
}

/**
 * 散歩ルートの距離レンジを算出する。
 * @param {number | null} estimatedDistanceKm 推定距離。
 * @param {string} adjustment 調整指示。
 * @returns {any} 距離レンジ。
 */
function buildDistanceRange(estimatedDistanceKm, adjustment) {
  let distanceMinKm = estimatedDistanceKm
    ? Math.max(1, Math.round(estimatedDistanceKm * 0.8 * 10) / 10)
    : null;
  let distanceMaxKm = estimatedDistanceKm
    ? Math.round(estimatedDistanceKm * 1.2 * 10) / 10
    : null;
  if (estimatedDistanceKm && adjustment === "longer") {
    distanceMinKm = Math.max(1, Math.round(estimatedDistanceKm * 1.1 * 10) / 10);
    distanceMaxKm = Math.round(estimatedDistanceKm * 1.4 * 10) / 10;
  } else if (estimatedDistanceKm && adjustment === "shorter") {
    distanceMinKm = Math.max(1, Math.round(estimatedDistanceKm * 0.6 * 10) / 10);
    distanceMaxKm = Math.round(estimatedDistanceKm * 0.9 * 10) / 10;
  }
  return { distanceMinKm, distanceMaxKm };
}

/**
 * 散歩ルート向けの計算値を算出する。
 * @param {any} context 解析結果。
 * @returns {any} 計算結果。
 */
function buildWalkRouteMetrics(context) {
  const maxMinutes = context.maxMinutes;
  const targetMinutes = context.targetMinutes;
  const targetInfo = resolveEffectiveTargetMinutes(maxMinutes, targetMinutes);
  const adjustment = context.adjustment;
  const actualMinutes = context.actualMinutes;
  const hasActualMinutes = Number.isFinite(actualMinutes) && actualMinutes > 0;
  const estimatedDistanceKm = Number.isFinite(targetInfo.effectiveTargetMinutes)
    ? Math.round(targetInfo.effectiveTargetMinutes * 0.08 * 10) / 10
    : null;
  const segmentInfo = buildSegmentRange(targetInfo.effectiveTargetMinutes);
  const distanceRange = buildDistanceRange(estimatedDistanceKm, adjustment);
  return {
    maxMinutes,
    targetMinutes,
    hasMaxMinutes: targetInfo.hasMaxMinutes,
    hasTargetMinutes: targetInfo.hasTargetMinutes,
    effectiveTargetMinutes: targetInfo.effectiveTargetMinutes,
    adjustment,
    actualMinutes,
    hasActualMinutes,
    estimatedDistanceKm,
    desiredStops: segmentInfo.desiredStops,
    segmentRange: segmentInfo.segmentRange,
    distanceMinKm: distanceRange.distanceMinKm,
    distanceMaxKm: distanceRange.distanceMaxKm,
  };
}

/**
 * 都道府県リストを整形する。
 * @param {string[]} prefectures 都道府県リスト。
 * @returns {string[]} 整形済みリスト。
 */
function normalizePrefectureList(prefectures) {
  return prefectures.map((entry) => entry.trim()).filter(Boolean);
}

/**
 * 都道府県ヒントを作成する。
 * @param {string[]} prefectureList 都道府県リスト。
 * @returns {string} ヒント文字列。
 */
function buildPrefectureHint(prefectureList) {
  return prefectureList.length
    ? `対象都道府県: ${prefectureList.join("・")}`
    : "";
}

/**
 * 検索対象地域を決定する。
 * @param {string} originRegion 出発地の地域。
 * @param {boolean} isWalkRoute 散歩ルート判定。
 * @param {number} effectiveTargetMinutes 目標分数。
 * @returns {string} 検索地域。
 */
function buildSearchRegion(originRegion, isWalkRoute, effectiveTargetMinutes) {
  let searchRegion = originRegion;
  if (isWalkRoute && effectiveTargetMinutes >= 120) {
    searchRegion = extractPrefecture(originRegion) || originRegion;
  }
  return searchRegion;
}

/**
 * 距離の目安文言を生成する。
 * @param {number | null} distanceMinKm 最短距離。
 * @param {number | null} distanceMaxKm 最長距離。
 * @returns {string} 目安文言。
 */
function buildDistanceHint(distanceMinKm, distanceMaxKm) {
  return distanceMinKm && distanceMaxKm
    ? `総距離の目安: ${distanceMinKm}〜${distanceMaxKm}km`
    : "総距離の目安: 目標所要時間に合わせて調整";
}

module.exports = {
  extractPrefecture,
  normalizeText,
  normalizeAdjustment,
  normalizeStringArray,
  parseRecommendPayload,
  validateRecommendRequest,
  resolveEffectiveTargetMinutes,
  buildSegmentRange,
  buildDistanceRange,
  buildWalkRouteMetrics,
  normalizePrefectureList,
  buildPrefectureHint,
  buildSearchRegion,
  buildDistanceHint,
};
