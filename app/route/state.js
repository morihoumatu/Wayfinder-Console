/* exported clearRoutes, clearWalkRouteState, clearDestination, resetRoute, setOrigin, setDestination */
/* exported getRouteStateSnapshot */
/* global clearRecommendResult: writable, clearRouteBreakdown: writable, desiredWalkTargetMinutes: writable */
/* global destinationLatLng: writable, destinationMarker: writable, destinationName: writable */
/* global destinationSource: writable, lastWalkQuery: writable, map: writable, originLatLng: writable */
/* global originMarker: writable, originRegion: writable, railRenderer: writable, railValue: writable */
/* global resolveOriginRegion: writable, setRecommendHint: writable, setRouteStatus: writable */
/* global updateRegionControls: writable, updateRouteHint: writable, updateRouteLabels: writable */
/* global updateRouteLinks: writable, walkRoutePreferredMode: writable, walkRouteRetryCount: writable */
/* global walkRouteTargetMinutes: writable, walkingRenderer: writable, walkingValue: writable */
/* global walkingWaypoints: writable */
/**
 * ルート状態のスナップショットを取得する。
 * @returns {any} 現在のルート状態。
 */
function getRouteStateSnapshot() {
  return {
    desiredWalkTargetMinutes,
    destinationLatLng,
    destinationName,
    lastWalkQuery,
    originLatLng,
    originRegion,
    walkRoutePreferredMode,
    walkRouteRetryCount,
    walkRouteTargetMinutes,
    walkingWaypoints,
  };
}

/**
 * ルート表示をクリアする。
 */
function clearRoutes() {
  if (walkingRenderer) {
    walkingRenderer.set("directions", null);
  }
  if (railRenderer) {
    railRenderer.set("directions", null);
  }
  walkingValue.textContent = "未計算";
  railValue.textContent = "未計算";
  setRouteStatus("地点を選ぶと自動計算します。");
  clearRouteBreakdown();
  updateRouteLinks();
}

/**
 * 散歩ルート状態を初期化する。
 */
function clearWalkRouteState() {
  walkingWaypoints = null;
  walkRouteTargetMinutes = null;
  walkRouteRetryCount = 0;
  lastWalkQuery = "";
  desiredWalkTargetMinutes = null;
  walkRoutePreferredMode = null;
}

/**
 * 目的地をクリアして状態をリセットする。
 * @param {string} message 表示メッセージ。
 */
function clearDestination(message) {
  destinationLatLng = null;
  destinationSource = null;
  destinationName = "";
  clearWalkRouteState();
  if (destinationMarker) {
    destinationMarker.setMap(null);
    destinationMarker = null;
  }
  if (walkingRenderer) {
    walkingRenderer.set("directions", null);
  }
  if (railRenderer) {
    railRenderer.set("directions", null);
  }
  walkingValue.textContent = "未計算";
  railValue.textContent = "未計算";
  setRouteStatus(message || "地点を選ぶと自動計算します。");
  clearRouteBreakdown();
  updateRouteLinks();
  updateRouteLabels();
  updateRouteHint();
}

/**
 * ルート全体をリセットする。
 */
function resetRoute() {
  originLatLng = null;
  destinationLatLng = null;
  destinationSource = null;
  originRegion = null;
  destinationName = "";
  clearWalkRouteState();
  if (originMarker) {
    originMarker.setMap(null);
    originMarker = null;
  }
  if (destinationMarker) {
    destinationMarker.setMap(null);
    destinationMarker = null;
  }
  clearRoutes();
  clearRecommendResult();
  setRecommendHint("出発地を選択してから検索できます。");
  updateRouteLinks();
  updateRouteLabels();
  updateRouteHint();
  updateRegionControls();
}

/**
 * 出発地を設定してマーカーを更新する。
 * @param {any} latLng 出発地座標。
 * @param {string | null} [regionOverride] 地域上書き。
 * @param {{ preserveWalkState?: boolean }} [options] 設定オプション。
 */
function setOrigin(latLng, regionOverride, options = {}) {
  originLatLng = latLng;
  originRegion = regionOverride || null;
  if (!options.preserveWalkState) {
    clearWalkRouteState();
  }
  if (originMarker) {
    originMarker.setMap(null);
  }
  originMarker = new google.maps.Marker({
    position: latLng,
    map,
    label: "A",
  });
  if (!regionOverride) {
    resolveOriginRegion(latLng).then((region) => {
      originRegion = region;
    });
  }
  updateRouteLinks();
  updateRegionControls();
}

/**
 * 目的地を設定してマーカーを更新する。
 * @param {any} latLng 目的地座標。
 * @param {string} source 設定元。
 * @param {{ label?: string }} [options] 設定オプション。
 */
function setDestination(latLng, source, options = {}) {
  destinationLatLng = latLng;
  destinationSource = source || "manual";
  destinationName =
    typeof options.label === "string" ? options.label.trim() : "";
  if (destinationSource !== "walk_multi") {
    clearWalkRouteState();
  }
  if (destinationMarker) {
    destinationMarker.setMap(null);
  }
  destinationMarker = new google.maps.Marker({
    position: latLng,
    map,
    label: "B",
  });
  updateRouteLinks();
}
