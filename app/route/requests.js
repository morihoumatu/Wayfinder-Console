/**
 * 経路検索APIの呼び出しをまとめる。
 * @file 経路検索APIの呼び出しをまとめる。
 */
/* exported buildWalkingRequest, buildTransitRequest, calculateRoutes */
/* global buildRouteFlags: writable, clearRouteBreakdown: writable, destinationLatLng: writable */
/* global destinationSource: writable, directionsService: writable, handleRouteResult: writable */
/* global originLatLng: writable, railRenderer: writable, railValue: writable, requestId: writable */
/* global setRouteStatus: writable, updateRouteLinks: writable, updateRouteModeCards: writable */
/* global walkingRenderer: writable, walkingValue: writable */
/* global getRouteModeSelection: writable, resolveWalkingWaypoints: writable */
/* global buildRailFallbackContext: writable, requestTransitRoute: writable */
/**
 * 徒歩ルートのリクエストを作成する。
 * @param {any} options 作成オプション。
 * @returns {any} リクエスト。
 */
function buildWalkingRequest(
  /** @type {{ origin: any, destination: any, waypoints: any[] | null }} */
  { origin, destination, waypoints }
) {
  /** @type {any} */
  const request = {
    origin,
    destination,
    travelMode: google.maps.TravelMode.WALKING,
  };
  if (Array.isArray(waypoints) && waypoints.length > 0) {
    request.waypoints = waypoints;
    request.optimizeWaypoints = false;
  }
  return request;
}

/**
 * 在来線ルートのリクエストを作成する。
 * @param {any} options 作成オプション。
 * @returns {any} リクエスト。
 */
function buildTransitRequest(
  /**
   * @type {{
   *   origin: any,
   *   destination: any,
   *   waypoints: any[] | null,
   *   allowWaypoints: boolean
   * }}
   */
  { origin, destination, waypoints, allowWaypoints }
) {
  /** @type {any} */
  const request = {
    origin,
    destination,
    travelMode: google.maps.TravelMode.TRANSIT,
    provideRouteAlternatives: true,
    transitOptions: {
      modes: [
        google.maps.TransitMode.TRAIN,
        google.maps.TransitMode.SUBWAY,
        google.maps.TransitMode.TRAM,
        google.maps.TransitMode.RAIL,
      ],
    },
  };
  if (allowWaypoints && Array.isArray(waypoints) && waypoints.length > 0) {
    request.waypoints = waypoints;
    request.optimizeWaypoints = false;
  }
  return request;
}

/**
 * モード未選択時の表示を更新する。
 */
function applyNoSelectionState() {
  if (walkingRenderer) {
    walkingRenderer.set("directions", null);
  }
  if (railRenderer) {
    railRenderer.set("directions", null);
  }
  walkingValue.textContent = "対象外";
  railValue.textContent = "対象外";
  setRouteStatus("徒歩または在来線を選択してください。");
  clearRouteBreakdown();
  updateRouteLinks();
}

/**
 * 在来線フォールバックを反映する。
 * @param {any} flags 判定フラグ。
 * @param {boolean} includeTransit 在来線の有無。
 * @returns {any | null} フォールバック情報。
 */
function buildRailFallbackState(flags, includeTransit) {
  // railFallbackの初期値を定義する。
  let railFallback = null;
  if (includeTransit) {
    // railFallbackを作成する。
    railFallback = buildRailFallbackContext();
    flags.railUsesStationFallback = railFallback.useFallback;
    flags.railExtraSeconds = railFallback.extraSeconds;
  } else {
    flags.railUsesStationFallback = false;
    flags.railExtraSeconds = null;
  }
  return railFallback;
}

/**
 * ルート計算のコンテキストを作成する。
 * @param {{ walkEnabled: boolean, railEnabled: boolean }} selection 選択状態。
 * @returns {any} 計算コンテキスト。
 */
function buildRouteCalculationContext(selection) {
  // includeWalkを取得する。
  const includeWalk = selection.walkEnabled;
  // includeTransitを取得する。
  const includeTransit = selection.railEnabled;
  // waypointsを解決する。
  const waypoints = resolveWalkingWaypoints();
  requestId += 1;
  // currentRequestを取得する。
  const currentRequest = requestId;
  // boundsのインスタンスを作成する。
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(originLatLng);
  bounds.extend(destinationLatLng);
  // flagsを作成する。
  const flags = buildRouteFlags({ includeWalk, includeTransit });
  // railFallbackを反映する。
  const railFallback = buildRailFallbackState(flags, includeTransit);
  return {
    includeWalk,
    includeTransit,
    waypoints,
    currentRequest,
    bounds,
    flags,
    railFallback,
  };
}

/**
 * ルート計算中の文言を取得する。
 * @param {boolean} includeWalk 徒歩有無。
 * @param {boolean} includeTransit 在来線有無。
 * @returns {string} 表示文言。
 */
function resolveCalculationStatusMessage(includeWalk, includeTransit) {
  // messageの初期値を定義する。
  let message = "";
  if (includeWalk && includeTransit) {
    message = "徒歩と在来線の経路を計算中...";
  } else {
    message = includeWalk ? "徒歩経路を計算中..." : "在来線経路を計算中...";
  }
  return message;
}

/**
 * ルート計算中の表示を更新する。
 * @param {any} context 計算コンテキスト。
 */
function applyRouteCalculationStatus(context) {
  // includeWalkを取得する。
  const includeWalk = context.includeWalk;
  // includeTransitを取得する。
  const includeTransit = context.includeTransit;
  walkingValue.textContent = includeWalk ? "計算中..." : "対象外";
  railValue.textContent = includeTransit ? "計算中..." : "対象外";
  if (!includeWalk && walkingRenderer) {
    walkingRenderer.set("directions", null);
  }
  if (!includeTransit && railRenderer) {
    railRenderer.set("directions", null);
  }
  // statusMessageを取得する。
  const statusMessage = resolveCalculationStatusMessage(
    includeWalk,
    includeTransit
  );
  setRouteStatus(statusMessage);
  clearRouteBreakdown();
  updateRouteLinks();
}

/**
 * 徒歩ルートの検索を行う。
 * @param {any} context 計算コンテキスト。
 */
function requestWalkingRoute(context) {
  if (!context.includeWalk) {
    return;
  }
  // walkingRequestを作成する。
  const walkingRequest = buildWalkingRequest({
    origin: originLatLng,
    destination: destinationLatLng,
    waypoints: context.waypoints,
  });
  directionsService.route(
    walkingRequest,
    (/** @type {any} */ result, /** @type {any} */ status) =>
      handleRouteResult({
        type: "walk",
        result,
        status,
        bounds: context.bounds,
        flags: context.flags,
        currentRequest: context.currentRequest,
      })
  );
}

/**
 * 在来線ルートの検索を行う。
 * @param {any} context 計算コンテキスト。
 */
function requestRailRoute(context) {
  if (!context.includeTransit) {
    return;
  }
  // railFallbackを取得する。
  const railFallback = context.railFallback;
  // transitRequestを作成する。
  const transitRequest = buildTransitRequest({
    origin: railFallback ? railFallback.origin : originLatLng,
    destination: railFallback ? railFallback.destination : destinationLatLng,
    waypoints: context.waypoints,
    allowWaypoints: destinationSource !== "walk_multi",
  });
  requestTransitRoute(transitRequest, {
    bounds: context.bounds,
    flags: context.flags,
    currentRequest: context.currentRequest,
  });
}

/**
 * 徒歩/鉄道ルートを計算して表示する。
 */
function calculateRoutes() {
  if (!originLatLng || !destinationLatLng || !directionsService) {
    return;
  }

  // selectionを取得する。
  const selection = getRouteModeSelection();
  updateRouteModeCards();
  if (!selection.hasSelection) {
    applyNoSelectionState();
  } else {
    // contextを作成する。
    const context = buildRouteCalculationContext(selection);
    applyRouteCalculationStatus(context);
    requestWalkingRoute(context);
    requestRailRoute(context);
  }
}
