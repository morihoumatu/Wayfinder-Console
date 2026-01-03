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
/* global routeLinks: writable, routeStatus: writable, statusCard: writable, walkRoutePreferredMode: writable */
/* global walkingRouteLink: writable, walkingWaypoints: writable */
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
 * ルートリンクを更新する。
 */
function updateRouteLinks() {
  if (!originLatLng || !destinationLatLng) {
    routeLinks.hidden = true;
    walkingRouteLink.hidden = true;
    railRouteLink.hidden = true;
    walkingRouteLink.href = "#";
    railRouteLink.href = "#";
    return;
  }

  // waypointPointsを条件で選ぶ。
  const waypointPoints = Array.isArray(walkingWaypoints)
    ? walkingWaypoints.map((waypoint) => waypoint.location).filter(Boolean)
    : [];

  walkingRouteLink.href = buildDirectionsLink({
    origin: originLatLng,
    destination: destinationLatLng,
    travelMode: "walking",
    waypoints: waypointPoints,
  });
  walkingRouteLink.hidden = false;

  // showRailLinkを条件で選ぶ。
  const showRailLink =
    destinationSource !== "walk_multi" || walkRoutePreferredMode === "rail";
  if (showRailLink) {
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
  } else {
    railRouteLink.hidden = true;
  }

  routeLinks.hidden = false;
}