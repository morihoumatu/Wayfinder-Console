/**
 * UIのステータス表示をまとめる。
 * @file UIのステータス表示をまとめる。
 */
/* exported setStatus, setOverlay, formatLatLng, updateRouteLabels, updateRouteHint, setOriginRegionHint */
/* exported updateRegionControls, setRouteStatus, updateRouteLinks */
/* global DEFAULT_ORIGIN_REGION_HINT: writable, buildDirectionsLink: writable, destinationLabel: writable */
/* global destinationLatLng: writable, destinationSource: writable, keyStatus: writable, originAreaSelect: writable */
/* global originLabel: writable, originLatLng: writable, originRegionButton: writable, originRegionHint: writable */
/* global originRegionSelect: writable, overlay: writable, railRouteLink: writable, routeHint: writable */
/* global getRouteModeSelection: writable, routeLinks: writable, routeStatus: writable */
/* global statusCard: writable, walkRoutePreferredMode: writable, walkingRouteLink: writable */
/* global walkingWaypoints: writable */
/**
 * 状態ラベルと状態表示を更新する。
 * @param {string} label 表示ラベル。
 * @param {string} state 状態値。
 */
function setStatus(label, state) {
  keyStatus.textContent = label;
  statusCard.dataset["state"] = state;
}

/**
 * オーバーレイ表示を切り替える。
 * @param {string} message 表示メッセージ。
 * @param {boolean} visible 表示フラグ。
 */
function setOverlay(message, visible) {
  overlay.textContent = message;
  overlay.classList.toggle("visible", visible);
}

/**
 * 緯度経度を表示用に整形する。
 * @param {any} latLng 緯度経度オブジェクト。
 * @returns {string} 表示用文字列。
 */
function formatLatLng(latLng) {
  return `${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
}

/**
 * 出発地と目的地のラベルを更新する。
 */
function updateRouteLabels() {
  originLabel.textContent = originLatLng ? formatLatLng(originLatLng) : "未選択";
  destinationLabel.textContent = destinationLatLng
    ? formatLatLng(destinationLatLng)
    : "未選択";
}

/**
 * ルート選択のヒントを更新する。
 */
function updateRouteHint() {
  // メッセージの初期値を定義する。
  let message =
    "2点が選択されています。必要ならリセットで再選択できます。";
  if (!originLatLng) {
    message = "マップをクリックして出発地を選択してください。";
  } else if (!destinationLatLng) {
    message = "次に目的地を選択してください。";
  }
  routeHint.textContent = message;
}

/**
 * 出発地の地域ヒントを更新する。
 * @param {string} message ヒント文。
 */
function setOriginRegionHint(message) {
  if (originRegionHint) {
    originRegionHint.textContent = message;
  }
}

/**
 * 地域選択UIの状態を更新する。
 */
function updateRegionControls() {
  if (!originRegionButton || !originRegionHint) {
    return;
  }
  // 判定結果を取得する。
  const hasOrigin = Boolean(originLatLng);
  if (originAreaSelect) {
    originAreaSelect.disabled = hasOrigin;
  }
  if (originRegionSelect) {
    originRegionSelect.disabled = hasOrigin;
  }
  originRegionButton.disabled = hasOrigin;
  if (hasOrigin) {
    originRegionHint.textContent =
      "出発地が選択済みです。リセットすると地域指定が使えます。";
  } else {
    originRegionHint.textContent = DEFAULT_ORIGIN_REGION_HINT;
  }
}

/**
 * ルート状態メッセージを更新する。
 * @param {string} message 状態メッセージ。
 */
function setRouteStatus(message) {
  routeStatus.textContent = message;
}

/**
 * ルートリンクを初期状態に戻す。
 */
function resetRouteLinkState() {
  routeLinks.hidden = true;
  walkingRouteLink.hidden = true;
  railRouteLink.hidden = true;
  walkingRouteLink.href = "#";
  railRouteLink.href = "#";
}

/**
 * 徒歩経路の経由地を取得する。
 * @returns {any[]} 経由地配列。
 */
function resolveWaypointPoints() {
  return Array.isArray(walkingWaypoints)
    ? walkingWaypoints.map((waypoint) => waypoint.location).filter(Boolean)
    : [];
}

/**
 * 徒歩リンクの表示を更新する。
 * @param {any[]} waypointPoints 経由地配列。
 * @param {boolean} walkEnabled 徒歩モードの有効フラグ。
 * @returns {boolean} 表示状態。
 */
function applyWalkingRouteLink(waypointPoints, walkEnabled) {
  // isVisibleの初期値を定義する。
  let isVisible = false;
  if (!walkEnabled) {
    walkingRouteLink.hidden = true;
    walkingRouteLink.href = "#";
  } else {
    walkingRouteLink.href = buildDirectionsLink({
      origin: originLatLng,
      destination: destinationLatLng,
      travelMode: "walking",
      waypoints: waypointPoints,
    });
    walkingRouteLink.hidden = false;
    isVisible = true;
  }
  return isVisible;
}

/**
 * 在来線リンクの表示を更新する。
 * @param {any[]} waypointPoints 経由地配列。
 * @param {boolean} railEnabled 在来線モードの有効フラグ。
 * @returns {boolean} 表示状態。
 */
function applyRailRouteLink(waypointPoints, railEnabled) {
  // isVisibleの初期値を定義する。
  let isVisible = false;
  // showRailLinkを条件で選ぶ。
  const showRailLink =
    railEnabled &&
    (destinationSource !== "walk_multi" || walkRoutePreferredMode === "rail");
  if (!showRailLink) {
    railRouteLink.hidden = true;
    railRouteLink.href = "#";
  } else {
    // railWaypointsを条件で選ぶ。
    const railWaypoints =
      destinationSource === "walk_multi" ? waypointPoints : null;
    railRouteLink.href = buildDirectionsLink({
      origin: originLatLng,
      destination: destinationLatLng,
      travelMode: "transit",
      transitMode: "rail",
      waypoints: railWaypoints,
    });
    railRouteLink.hidden = false;
    isVisible = true;
  }
  return isVisible;
}

/**
 * ルートリンクを更新する。
 */
function updateRouteLinks() {
  // selectionを取得する。
  const selection = getRouteModeSelection();
  // walkEnabledを取得する。
  const walkEnabled = selection.walkEnabled;
  // railEnabledを取得する。
  const railEnabled = selection.railEnabled;
  if (!originLatLng || !destinationLatLng || (!walkEnabled && !railEnabled)) {
    resetRouteLinkState();
    return;
  }

  // waypointPointsを条件で選ぶ。
  const waypointPoints = resolveWaypointPoints();
  // hasWalkingLinkを取得する。
  const hasWalkingLink = applyWalkingRouteLink(waypointPoints, walkEnabled);
  // hasRailLinkを取得する。
  const hasRailLink = applyRailRouteLink(waypointPoints, railEnabled);
  routeLinks.hidden = !(hasWalkingLink || hasRailLink);
}
