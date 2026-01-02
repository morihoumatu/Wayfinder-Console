/* exported collectTransitSteps, buildTransitStopsFromSteps, extractTransitStops, buildWalkSegment, buildRailSegment */
/**
 * 乗換ステップを収集する。
 * @param {any} route 経路データ。
 * @param {any} transitMode 交通モード。
 * @returns {any[]} 乗換ステップ配列。
 */
function collectTransitSteps(route, transitMode) {
  /** @type {any[]} */
  const transitSteps = [];
  if (route) {
    (route.legs || []).forEach((/** @type {any} */ leg) => {
      (leg.steps || []).forEach((/** @type {any} */ step) => {
        if (
          step.travel_mode === transitMode ||
          step.travel_mode === "TRANSIT"
        ) {
          transitSteps.push(step);
        }
      });
    });
  }
  return transitSteps;
}

/**
 * 乗降駅情報を組み立てる。
 * @param {any[]} transitSteps 乗換ステップ配列。
 * @returns {any} 乗降駅情報。
 */
function buildTransitStopsFromSteps(transitSteps) {
  let stops = null;
  if (Array.isArray(transitSteps) && transitSteps.length) {
    const first = transitSteps[0].transit;
    const last = transitSteps[transitSteps.length - 1].transit;
    const departure = first?.departure_stop || null;
    const arrival = last?.arrival_stop || null;
    if (departure?.location && arrival?.location) {
      stops = { departure, arrival };
    }
  }
  return stops;
}

/**
 * 経路結果から乗降駅情報を抽出する。
 * @param {any} result 経路結果。
 * @returns {any} 乗降駅情報。
 */
function extractTransitStops(result) {
  const route = result?.routes?.[0];
  const transitMode =
    (typeof google !== "undefined" &&
      google.maps &&
      google.maps.TravelMode &&
      google.maps.TravelMode.TRANSIT) ||
    "TRANSIT";
  const transitSteps = collectTransitSteps(route, transitMode);
  const stops = buildTransitStopsFromSteps(transitSteps);
  return stops;
}

/**
 * 徒歩区間の情報を作成する。
 * @param {{ origin: any, destination: any, fromLabel?: any, toLabel?: any, waypoints?: any }} options 区間オプション。
 * @returns {any | null} 区間情報またはnull。
 */
function buildWalkSegment(
  /** @type {{ origin: any, destination: any, fromLabel?: any, toLabel?: any, waypoints?: any }} */
  { origin, destination, fromLabel, toLabel, waypoints }
) {
  let segment = null;
  if (origin && destination) {
    const meta =
      fromLabel && toLabel ? `${fromLabel} → ${toLabel}` : "";
    segment = {
      title: "徒歩ルート",
      meta,
      origin,
      destination,
      travelMode: "walking",
      waypoints,
      linkLabel: "Google Mapsで徒歩ルートを見る",
      fromLabel,
      toLabel,
    };
  }
  return segment;
}

/**
 * 在来線区間の情報を作成する。
 * @param {{ origin: any, destination: any, fromLabel?: any, toLabel?: any }} options 区間オプション。
 * @returns {any | null} 区間情報またはnull。
 */
function buildRailSegment(
  /** @type {{ origin: any, destination: any, fromLabel?: any, toLabel?: any }} */
  { origin, destination, fromLabel, toLabel }
) {
  let segment = null;
  if (origin && destination) {
    const title =
      fromLabel && toLabel ? `${fromLabel}〜${toLabel}` : "在来線ルート";
    segment = {
      title,
      meta: "在来線",
      origin,
      destination,
      travelMode: "transit",
      transitMode: "rail",
      linkLabel: "Google Mapsで在来線ルートを見る",
      fromLabel,
      toLabel,
    };
  }
  return segment;
}