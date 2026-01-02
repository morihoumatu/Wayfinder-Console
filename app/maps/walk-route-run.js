/**
 * 散歩ルート検索の実行処理をまとめる。
 * @file 散歩ルート検索の実行処理をまとめる。
 */
/* exported applyWalkRouteDestination, runWalkRouteSearch */
/* global applyWalkRouteOriginFromStops: writable, buildWalkRouteRegionInfo: writable, calculateRoutes: writable */
/* global clearRecommendResult: writable, desiredWalkTargetMinutes: writable, fetchWalkRouteRecommendation: writable */
/* global getStopLabel: writable, resolveWalkRouteLocations: writable, resolveWalkRouteOriginOverride: writable */
/* global resolveWalkRouteOriginStatus: writable, setDestination: writable, setRecommendHint: writable */
/* global setRecommendLoading: writable, showRecommendResult: writable, updateRouteHint: writable */
/* global updateRouteLabels: writable, updateRouteLinks: writable, walkRoutePreferredMode: writable */
/* global walkRouteTargetMinutes: writable, walkingWaypoints: writable */
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
  const waypointStartIndex = originUsesStartLocation ? 1 : 0;
  walkingWaypoints = locations.slice(waypointStartIndex, -1).map((location) => ({
    location,
    stopover: true,
  }));
  const endStop = Array.isArray(place?.stops)
    ? place.stops[place.stops.length - 1]
    : null;
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
  const previousMode = walkRoutePreferredMode;
  walkRoutePreferredMode = null;
  return previousMode;
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
  setRecommendLoading(true);
  setRecommendHint(auto ? "時間調整のため再検索中..." : "散歩ルートを作成中...");
  clearRecommendResult();
  resetWalkRoutePreferredMode();

  try {
    const regionInfo = buildWalkRouteRegionInfo(Boolean(auto));
    const originStatus = await resolveWalkRouteOriginStatus(
      regionInfo.regionContext
    );
    const originOverrides = await resolveWalkRouteOriginOverride({
      originMissing: originStatus.originMissing,
      originMismatch: originStatus.originMismatch,
      regionForPrompt: regionInfo.regionForPrompt,
      regionAnchor: regionInfo.regionAnchor,
      regionLabel: regionInfo.regionLabel,
    });
    const place = await fetchWalkRouteRecommendation({
      query,
      requestTargetMinutes,
      adjustment,
      actualMinutes,
      originOverride: originOverrides.originOverride,
      originRegionOverride: originOverrides.originRegionOverride,
      regionContext: regionInfo.regionContext,
    });
    showRecommendResult(place);

    const locationInfo = await resolveWalkRouteLocations(place);
    const originUsesStartLocation = await applyWalkRouteOriginFromStops({
      originMissing: originStatus.originMissing,
      startLocation: locationInfo.startLocation,
      startStopName: locationInfo.startStopName,
      regionFilter: regionInfo.regionFilter,
      regionLabel: regionInfo.regionLabel,
      originRegionOverride: originOverrides.originRegionOverride,
    });
    applyWalkRouteDestination({
      locations: locationInfo.locations,
      originUsesStartLocation,
      place,
      desiredTargetMinutes,
    });
    setRecommendHint(
      auto ? "散歩ルートを調整しました。" : "おすすめの散歩ルートを表示しました。"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setRecommendHint(message || "おすすめ地点の取得に失敗しました。");
  } finally {
    setRecommendLoading(false);
  }
}
