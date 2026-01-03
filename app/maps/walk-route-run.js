/**
 * 散歩ルート検索の実行処理をまとめる。
 * @file 散歩ルート検索の実行処理をまとめる。
 */
/* exported applyWalkRouteDestination, runWalkRouteSearch */
/* global applyWalkRouteOriginFromStops: writable, buildWalkRouteRegionInfo: writable, calculateRoutes: writable */
/* global clearRecommendResult: writable, desiredWalkTargetMinutes: writable, fetchWalkRouteRecommendation: writable */
/* global findNearestStationToLocation: writable, getStopLabel: writable */
/* global resolveWalkRouteLocations: writable, resolveWalkRouteOriginOverride: writable */
/* global resolveWalkRouteOriginStatus: writable, setDestination: writable, setRecommendHint: writable */
/* global setRecommendLoading: writable, showRecommendResult: writable, updateRouteHint: writable */
/* global updateRouteLabels: writable, updateRouteLinks: writable, walkRoutePreferredMode: writable */
/* global walkRouteRailStations: writable, walkRouteTargetMinutes: writable, walkingWaypoints: writable */
/**
 * 散歩ルートの目的地と経由地を更新する。
 * @param {any} options 更新オプション。
 * @returns {any} 更新後の経路状態。
 */
function applyWalkRouteDestination(
  /**
   * @type {{
   *   locations: any[],
   *   originUsesStartLocation: boolean,
   *   place: any,
   *   desiredTargetMinutes: any
   * }}
   */
  { locations, originUsesStartLocation, place, desiredTargetMinutes }
) {
  // インデックスを条件で選ぶ。
  const waypointStartIndex = originUsesStartLocation ? 1 : 0;
  walkingWaypoints = locations.slice(waypointStartIndex, -1).map((location) => ({
    location,
    stopover: true,
  }));
  // endStopを条件で選ぶ。
  const endStop = Array.isArray(place?.stops)
    ? place.stops[place.stops.length - 1]
    : null;
  // endStopLabelを条件で選ぶ。
  const endStopLabel =
    getStopLabel(endStop) || place?.address || place?.area || "";
  walkRouteTargetMinutes = desiredTargetMinutes;
  desiredWalkTargetMinutes = desiredTargetMinutes;
  setDestination(locations[locations.length - 1], "walk_multi", {
    label: endStopLabel,
  });
  updateRouteLabels();
  updateRouteHint();
  updateRouteLinks();
  calculateRoutes();
  return {
    walkingWaypoints,
    walkRouteTargetMinutes,
    desiredWalkTargetMinutes,
  };
}

/**
 * 散歩ルートの優先モードを初期化する。
 * @returns {string | null} 直前の優先モード。
 */
function resetWalkRoutePreferredMode() {
  // previousModeの参照を保持する。
  const previousMode = walkRoutePreferredMode;
  walkRoutePreferredMode = null;
  return previousMode;
}

/**
 * 散歩ルート検索の開始ヒントを取得する。
 * @param {boolean} auto 再検索フラグ。
 * @returns {string} ヒント文言。
 */
function getWalkRouteSearchStartHint(auto) {
  return auto ? "時間調整のため再検索中..." : "散歩ルートを作成中...";
}

/**
 * 散歩ルート検索の完了ヒントを取得する。
 * @param {boolean} auto 再検索フラグ。
 * @returns {string} ヒント文言。
 */
function getWalkRouteSearchSuccessHint(auto) {
  return auto ? "散歩ルートを調整しました。" : "おすすめの散歩ルートを表示しました。";
}

/**
 * 配列の件数を取得する。
 * @param {any} value 対象配列。
 * @returns {number} 件数。
 */
function resolveListCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * 目標分数を決定する。
 * @param {number | null | undefined} desired 目標分数。
 * @param {number | null | undefined} requested 目標分数。
 * @returns {number | null} 目標分数。
 */
function resolveWalkRouteTargetMinutes(desired, requested) {
  return desired || requested || null;
}

/**
 * 散歩ルート用の在来線駅候補を取得する。
 * @param {any} options 取得オプション。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function resolveWalkRouteRailStations(
  /**
   * @type {{
   *   place: any,
   *   locationInfo: any,
   *   regionFilter: any[],
   *   originRegionOverride: string | null
   * }}
   */
  { place, locationInfo, regionFilter, originRegionOverride }
) {
  walkRouteRailStations = null;
  // endLocationの参照を保持する。
  const endLocation = locationInfo.locations[locationInfo.locations.length - 1];
  // regionValueを条件で選ぶ。
  const regionValue = regionFilter.length ? regionFilter : originRegionOverride;
  // endStopを条件で選ぶ。
  const endStop = Array.isArray(place?.stops)
    ? place.stops[place.stops.length - 1]
    : null;
  // endStopNameを取得する。
  const endStopName = getStopLabel(endStop);
  // startStationを取得する。
  const startStation = await findNearestStationToLocation({
    startLocation: locationInfo.startLocation,
    stopName: locationInfo.startStopName,
    region: regionValue,
  });
  // endStationを取得する。
  const endStation = await findNearestStationToLocation({
    startLocation: endLocation,
    stopName: endStopName,
    region: regionValue,
  });
  if (startStation?.location && endStation?.location) {
    walkRouteRailStations = {
      origin: startStation,
      destination: endStation,
    };
  }
  logWalkRouteSearchState("rail stations", {
    origin: startStation?.name || "",
    destination: endStation?.name || "",
    originOk: Boolean(startStation?.location),
    destinationOk: Boolean(endStation?.location),
    stored: Boolean(walkRouteRailStations),
  });
}

/**
 * 散歩ルート検索の進捗ログを出力する。
 * @param {string} label ログラベル。
 * @param {any} details 詳細情報。
 */
function logWalkRouteSearchState(label, details) {
  console.warn(`[walk_multi] ${label}`, details);
}

/**
 * 散歩ルート検索を実行する。
 * @param {{
 *   query?: any,
 *   requestTargetMinutes?: any,
 *   desiredTargetMinutes?: any,
 *   adjustment?: any,
 *   actualMinutes?: any,
 *   auto?: boolean
 * }} options 検索オプション。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function runWalkRouteSearch(
  /**
   * @type {{
   *   query?: any,
   *   requestTargetMinutes?: any,
   *   desiredTargetMinutes?: any,
   *   adjustment?: any,
   *   actualMinutes?: any,
   *   auto?: boolean
   * }}
   */
  {
    query,
    requestTargetMinutes,
    desiredTargetMinutes,
    adjustment,
    actualMinutes,
    auto,
  }
) {
  logWalkRouteSearchState("search start", {
    query,
    requestTargetMinutes,
    desiredTargetMinutes,
    adjustment,
    actualMinutes,
    auto,
  });
  setRecommendLoading(true);
  setRecommendHint(getWalkRouteSearchStartHint(Boolean(auto)));
  clearRecommendResult();
  resetWalkRoutePreferredMode();

  try {
    // regionInfoを作成する。
    const regionInfo = buildWalkRouteRegionInfo(Boolean(auto));
    logWalkRouteSearchState("region", {
      label: regionInfo.regionLabel,
      prompt: regionInfo.regionForPrompt,
      anchor: regionInfo.regionAnchor,
      prefectureCount: resolveListCount(regionInfo.regionFilter),
    });
    // 状態を解決する。
    const originStatus = await resolveWalkRouteOriginStatus(
      regionInfo.regionContext
    );
    logWalkRouteSearchState("origin status", {
      originMissing: originStatus.originMissing,
      originMismatch: originStatus.originMismatch,
    });
    // IDを解決する。
    const originOverrides = await resolveWalkRouteOriginOverride({
      originMissing: originStatus.originMissing,
      originMismatch: originStatus.originMismatch,
      regionForPrompt: regionInfo.regionForPrompt,
      regionAnchor: regionInfo.regionAnchor,
      regionLabel: regionInfo.regionLabel,
    });
    logWalkRouteSearchState("origin override", {
      hasOverride: Boolean(originOverrides.originOverride),
      regionOverride: originOverrides.originRegionOverride,
    });
    // placeを取得する。
    const place = await fetchWalkRouteRecommendation({
      query,
      requestTargetMinutes,
      adjustment,
      actualMinutes,
      originOverride: originOverrides.originOverride,
      originRegionOverride: originOverrides.originRegionOverride,
      regionContext: regionInfo.regionContext,
    });
    logWalkRouteSearchState("recommendation", {
      name: place?.name,
      area: place?.area,
      stopCount: resolveListCount(place?.stops),
      targetMinutes: place?.target_minutes,
    });
    showRecommendResult(place);

    // locationInfoを解決する。
    const locationInfo = await resolveWalkRouteLocations(place);
    logWalkRouteSearchState("geocode", {
      stopCount: resolveListCount(place?.stops),
      locationCount: locationInfo.locations.length,
      startStopName: locationInfo.startStopName,
    });
    await resolveWalkRouteRailStations({
      place,
      locationInfo,
      regionFilter: regionInfo.regionFilter,
      originRegionOverride: originOverrides.originRegionOverride,
    });
    // targetMinutesを解決する。
    const targetMinutes = resolveWalkRouteTargetMinutes(
      desiredTargetMinutes,
      requestTargetMinutes
    );
    // originUsesStartLocationを取得する。
    const originUsesStartLocation = await applyWalkRouteOriginFromStops({
      originMissing: originStatus.originMissing,
      startLocation: locationInfo.startLocation,
      startStopName: locationInfo.startStopName,
      regionFilter: regionInfo.regionFilter,
      regionLabel: regionInfo.regionLabel,
      originRegionOverride: originOverrides.originRegionOverride,
      targetMinutes,
    });
    logWalkRouteSearchState("origin selected", {
      originUsesStartLocation,
      targetMinutes,
    });
    // 状態を取得する。
    const destinationState = applyWalkRouteDestination({
      locations: locationInfo.locations,
      originUsesStartLocation,
      place,
      desiredTargetMinutes,
    });
    logWalkRouteSearchState("destination", {
      waypointCount: resolveListCount(destinationState.walkingWaypoints),
      targetMinutes: destinationState.walkRouteTargetMinutes,
      desiredTargetMinutes: destinationState.desiredWalkTargetMinutes,
    });
    setRecommendHint(getWalkRouteSearchSuccessHint(Boolean(auto)));
  } catch (error) {
    // メッセージを条件で選ぶ。
    const message = error instanceof Error ? error.message : String(error);
    setRecommendHint(message || "おすすめ地点の取得に失敗しました。");
  } finally {
    setRecommendLoading(false);
  }
}
