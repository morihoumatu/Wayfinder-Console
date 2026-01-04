/**
 * ルート状態の管理をまとめる。
 * @file ルート状態の管理をまとめる。
 */
/* exported clearRoutes, clearWalkRouteState, clearDestination, resetRoute, setOrigin, setDestination */
/* exported updateRouteModeCards */
/* exported getRouteStateSnapshot */
/* global clearRecommendResult: writable, clearRouteBreakdown: writable, desiredWalkTargetMinutes: writable */
/* global destinationLatLng: writable, destinationMarker: writable, destinationName: writable */
/* global destinationSource: writable, lastWalkQuery: writable, map: writable, originLatLng: writable */
/* global originMarker: writable, originRegion: writable, railRenderer: writable, railValue: writable */
/* global getRouteModeSelection: writable, resolveOriginRegion: writable */
/* global setRecommendHint: writable, setRouteStatus: writable */
/* global updateRegionControls: writable, updateRouteHint: writable, updateRouteLabels: writable */
/* global updateRouteLinks: writable, walkRoutePreferredMode: writable, walkRouteRetryCount: writable */
/* global walkRouteRailStations: writable, walkRouteTargetMinutes: writable */
/* global walkingRenderer: writable, walkingValue: writable, walkingWaypoints: writable */
/**
 * 時間カードの状態を切り替える。
 * @param {HTMLElement | null} target 対象要素。
 * @param {boolean} enabled 表示フラグ。
 */
function toggleRouteCardState(target, enabled) {
  // cardを取得する。
  const card = target ? target.closest(".time-card") : null;
  if (!(card instanceof HTMLElement)) {
    return;
  }
  if (enabled) {
    card.removeAttribute("data-disabled");
  } else {
    card.dataset["disabled"] = "true";
  }
}

/**
 * ルートモードのカード状態を更新する。
 */
function updateRouteModeCards() {
  // selectionを取得する。
  const selection = getRouteModeSelection();
  toggleRouteCardState(walkingValue, selection.walkEnabled);
  toggleRouteCardState(railValue, selection.railEnabled);
}
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
    walkRouteRailStations,
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
  // selectionを取得する。
  const selection = getRouteModeSelection();
  walkingValue.textContent = selection.walkEnabled ? "未計算" : "対象外";
  railValue.textContent = selection.railEnabled ? "未計算" : "対象外";
  setRouteStatus(
    selection.hasSelection
      ? "地点を選ぶと自動計算します。"
      : "徒歩または在来線を選択してください。"
  );
  updateRouteModeCards();
  clearRouteBreakdown();
  updateRouteLinks();
}

/**
 * 散歩ルート状態を初期化する。
 */
function clearWalkRouteState() {
  walkingWaypoints = null;
  walkRouteRailStations = null;
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
  // selectionを取得する。
  const selection = getRouteModeSelection();
  walkingValue.textContent = selection.walkEnabled ? "未計算" : "対象外";
  railValue.textContent = selection.railEnabled ? "未計算" : "対象外";
  setRouteStatus(
    message ||
      (selection.hasSelection
        ? "地点を選ぶと自動計算します。"
        : "徒歩または在来線を選択してください。")
  );
  updateRouteModeCards();
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
