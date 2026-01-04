/**
 * 経路検索APIの補助関数をまとめる。
 * @file 経路検索APIの補助関数をまとめる。
 */
/* exported resolveWalkMultiRailFallback, resolveWalkMultiRailExtraSeconds */
/* exported resolveWalkingWaypoints, buildRailFallbackContext, requestTransitRoute */
/* global destinationLatLng: writable, destinationSource: writable, directionsService: writable */
/* global handleRouteResult: writable, originLatLng: writable, railRenderer: writable */
/* global walkRouteRailStations: writable, walkingWaypoints: writable */
/* global computeDistanceMeters: writable, getLatLngLiteral: writable */
/**
 * 散歩ルートの在来線フォールバック駅を取得する。
 * @returns {{ origin: any, destination: any, originName: string, destinationName: string } | null} 駅情報。
 */
function resolveWalkMultiRailFallback() {
  // fallbackの初期値を定義する。
  let fallback = null;
  if (destinationSource === "walk_multi" && walkRouteRailStations) {
    // originStationを条件で選ぶ。
    const originStation = walkRouteRailStations.origin?.location || null;
    // destinationStationを条件で選ぶ。
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
  // extraSecondsの初期値を定義する。
  let extraSeconds = null;
  if (fallback) {
    // originLiteralを取得する。
    const originLiteral = getLatLngLiteral(originLatLng);
    // destinationLiteralを取得する。
    const destinationLiteral = getLatLngLiteral(destinationLatLng);
    // railOriginLiteralを取得する。
    const railOriginLiteral = getLatLngLiteral(fallback.origin);
    // railDestinationLiteralを取得する。
    const railDestinationLiteral = getLatLngLiteral(fallback.destination);
    if (
      originLiteral &&
      destinationLiteral &&
      railOriginLiteral &&
      railDestinationLiteral
    ) {
      // originDistanceを計算する。
      const originDistance = computeDistanceMeters(originLiteral, railOriginLiteral);
      // destinationDistanceを計算する。
      const destinationDistance = computeDistanceMeters(
        destinationLiteral,
        railDestinationLiteral
      );
      if (originDistance !== null && destinationDistance !== null) {
        // 件数を用意する。
        const totalMeters = originDistance + destinationDistance;
        // walkMinutesを用意する。
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
  // fallbackを解決する。
  const fallback = resolveWalkMultiRailFallback();
  // useFallbackを取得する。
  const useFallback = Boolean(fallback);
  // originを条件で選ぶ。
  const origin = fallback ? fallback.origin : originLatLng;
  // destinationを条件で選ぶ。
  const destination = fallback ? fallback.destination : destinationLatLng;
  // extraSecondsを解決する。
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
