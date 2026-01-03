/**
 * 経路検索APIの呼び出しをまとめる。
 * @file 経路検索APIの呼び出しをまとめる。
 */
/* exported buildWalkingRequest, buildTransitRequest, calculateRoutes */
/* global buildRouteFlags: writable, clearRouteBreakdown: writable, destinationLatLng: writable */
/* global destinationSource: writable, directionsService: writable, handleRouteResult: writable */
/* global originLatLng: writable, railRenderer: writable, railValue: writable, requestId: writable */
/* global setRouteStatus: writable, updateRouteLinks: writable, walkingValue: writable, walkingWaypoints: writable */
/* global computeDistanceMeters: writable, getLatLngLiteral: writable, walkRouteRailStations: writable */
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
 * 散歩ルートの在来線フォールバック駅を取得する。
 * @returns {{ origin: any, destination: any, originName: string, destinationName: string } | null} 駅情報。
 */
function resolveWalkMultiRailFallback() {
  let fallback = null;
  if (destinationSource === "walk_multi" && walkRouteRailStations) {
    const originStation = walkRouteRailStations.origin?.location || null;
    const destinationStation = walkRouteRailStations.destination?.location || null;
    if (originStation && destinationStation) {
      fallback = {
        origin: originStation,
        destination: destinationStation,
        originName: walkRouteRailStations.origin?.name || "",
        destinationName: walkRouteRailStations.destination?.name || "",
      };
    }
  }
  return fallback;
}

/**
 * 在来線フォールバック駅までの徒歩時間を推定する。
 * @param {{ origin: any, destination: any } | null} fallback 駅情報。
 * @returns {number | null} 追加徒歩時間（秒）。
 */
function resolveWalkMultiRailExtraSeconds(fallback) {
  let extraSeconds = null;
  if (fallback) {
    const originLiteral = getLatLngLiteral(originLatLng);
    const destinationLiteral = getLatLngLiteral(destinationLatLng);
    const railOriginLiteral = getLatLngLiteral(fallback.origin);
    const railDestinationLiteral = getLatLngLiteral(fallback.destination);
    if (
      originLiteral &&
      destinationLiteral &&
      railOriginLiteral &&
      railDestinationLiteral
    ) {
      const originDistance = computeDistanceMeters(originLiteral, railOriginLiteral);
      const destinationDistance = computeDistanceMeters(
        destinationLiteral,
        railDestinationLiteral
      );
      if (originDistance !== null && destinationDistance !== null) {
        const totalMeters = originDistance + destinationDistance;
        const walkMinutes = totalMeters / 80;
        extraSeconds = Math.round(walkMinutes * 60);
      }
    }
  }
  return extraSeconds;
}

/**
 * 徒歩ルートの経由地を取得する。
 * @returns {any[] | null} 経由地配列。
 */
function resolveWalkingWaypoints() {
  return Array.isArray(walkingWaypoints) && walkingWaypoints.length > 0
    ? walkingWaypoints
    : null;
}

/**
 * 在来線のフォールバック情報を整理する。
 * @returns {{ origin: any, destination: any, useFallback: boolean, extraSeconds: number | null }} 情報。
 */
function buildRailFallbackContext() {
  const fallback = resolveWalkMultiRailFallback();
  const useFallback = Boolean(fallback);
  const origin = fallback ? fallback.origin : originLatLng;
  const destination = fallback ? fallback.destination : destinationLatLng;
  const extraSeconds = resolveWalkMultiRailExtraSeconds(fallback);
  if (fallback) {
    console.warn("[walk_multi] rail fallback stations", {
      origin: fallback.originName,
      destination: fallback.destinationName,
      extraSeconds,
    });
  }
  return {
    origin,
    destination,
    useFallback,
    extraSeconds,
  };
}

/**
 * 在来線ルートをリクエストする。
 * @param {any} transitRequest リクエスト。
 * @param {any} options リクエストオプション。
 */
function requestTransitRoute(
  transitRequest,
  /** @type {{ bounds: any, flags: any, currentRequest: number }} */
  { bounds, flags, currentRequest }
) {
  if (transitRequest) {
    directionsService.route(
      transitRequest,
      (/** @type {any} */ result, /** @type {any} */ status) =>
        handleRouteResult({
          type: "rail",
          result,
          status,
          bounds,
          flags,
          currentRequest,
        })
    );
  } else if (railRenderer) {
    railRenderer.set("directions", null);
  }
}

/**
 * 徒歩/鉄道ルートを計算して表示する。
 */
function calculateRoutes() {
  if (!originLatLng || !destinationLatLng || !directionsService) {
    return;
  }

  const includeTransit = true;
  const waypoints = resolveWalkingWaypoints();

  requestId += 1;
  const currentRequest = requestId;
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(originLatLng);
  bounds.extend(destinationLatLng);

  const flags = buildRouteFlags(includeTransit);
  const railFallback = buildRailFallbackContext();
  flags.railUsesStationFallback = railFallback.useFallback;
  flags.railExtraSeconds = railFallback.extraSeconds;

  walkingValue.textContent = "計算中...";
  railValue.textContent = includeTransit ? "計算中..." : "対象外";
  setRouteStatus("経路を計算中...");
  clearRouteBreakdown();
  updateRouteLinks();

  const walkingRequest = buildWalkingRequest({
    origin: originLatLng,
    destination: destinationLatLng,
    waypoints,
  });

  directionsService.route(
    walkingRequest,
    (/** @type {any} */ result, /** @type {any} */ status) =>
      handleRouteResult({
        type: "walk",
        result,
        status,
        bounds,
        flags,
        currentRequest,
      })
  );

  const transitRequest = includeTransit
    ? buildTransitRequest({
        origin: railFallback.origin,
        destination: railFallback.destination,
        waypoints,
        allowWaypoints: destinationSource !== "walk_multi",
      })
    : null;
  requestTransitRoute(transitRequest, { bounds, flags, currentRequest });
}
