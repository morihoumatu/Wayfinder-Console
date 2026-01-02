/**
 * 経路検索APIの呼び出しをまとめる。
 * @file 経路検索APIの呼び出しをまとめる。
 */
/* exported buildWalkingRequest, buildTransitRequest, calculateRoutes */
/* global buildRouteFlags: writable, clearRouteBreakdown: writable, destinationLatLng: writable */
/* global destinationSource: writable, directionsService: writable, handleRouteResult: writable */
/* global originLatLng: writable, railRenderer: writable, railValue: writable, requestId: writable */
/* global setRouteStatus: writable, updateRouteLinks: writable, walkingValue: writable, walkingWaypoints: writable */
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
 * 徒歩/鉄道ルートを計算して表示する。
 */
function calculateRoutes() {
  if (!originLatLng || !destinationLatLng || !directionsService) {
    return;
  }

  const includeTransit = true;
  const waypoints =
    Array.isArray(walkingWaypoints) && walkingWaypoints.length > 0
      ? walkingWaypoints
      : null;

  requestId += 1;
  const currentRequest = requestId;
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(originLatLng);
  bounds.extend(destinationLatLng);

  const flags = buildRouteFlags(includeTransit);

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
        origin: originLatLng,
        destination: destinationLatLng,
        waypoints,
        allowWaypoints: destinationSource !== "walk_multi",
      })
    : null;
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