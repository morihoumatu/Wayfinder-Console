const MAPS_API_KEY =
  /** @type {string} */ ("AIzaSyAvB1sNfAZg5Gc_1cp2CLWL_iGDFASrD9I");
const DEFAULT_CENTER = { lat: 35.681236, lng: 139.767125 };
const DEFAULT_ZOOM = 13;

const statusCard = /** @type {HTMLDivElement} */ (
  document.getElementById("statusCard")
);
const keyStatus = /** @type {HTMLParagraphElement} */ (
  document.getElementById("keyStatus")
);
const overlay = /** @type {HTMLDivElement} */ (
  document.getElementById("mapOverlay")
);
const mapElement = /** @type {HTMLDivElement} */ (
  document.getElementById("map")
);
const originLabel = /** @type {HTMLParagraphElement} */ (
  document.getElementById("originLabel")
);
const destinationLabel = /** @type {HTMLParagraphElement} */ (
  document.getElementById("destinationLabel")
);
const walkingValue = /** @type {HTMLParagraphElement} */ (
  document.getElementById("walkingValue")
);
const railValue = /** @type {HTMLParagraphElement} */ (
  document.getElementById("railValue")
);
const routeHint = /** @type {HTMLParagraphElement} */ (
  document.getElementById("routeHint")
);
const routeStatus = /** @type {HTMLParagraphElement} */ (
  document.getElementById("routeStatus")
);
const routeLinks = /** @type {HTMLDivElement} */ (
  document.getElementById("routeLinks")
);
const walkingRouteLink = /** @type {HTMLAnchorElement} */ (
  document.getElementById("walkingRouteLink")
);
const railRouteLink = /** @type {HTMLAnchorElement} */ (
  document.getElementById("railRouteLink")
);
const routeBreakdown = /** @type {HTMLDivElement} */ (
  document.getElementById("routeBreakdown")
);
const routeBreakdownList = /** @type {HTMLOListElement} */ (
  document.getElementById("routeBreakdownList")
);
const resetButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("resetRoute")
);
const recommendForm = /** @type {HTMLFormElement} */ (
  document.getElementById("recommendForm")
);
const recommendQuery = /** @type {HTMLInputElement} */ (
  document.getElementById("recommendQuery")
);
const maxTimeInput = /** @type {HTMLInputElement} */ (
  document.getElementById("maxTimeInput")
);
const limitHint = /** @type {HTMLParagraphElement} */ (
  document.getElementById("limitHint")
);
const recommendHint = /** @type {HTMLParagraphElement} */ (
  document.getElementById("recommendHint")
);
const recommendResult = /** @type {HTMLDivElement} */ (
  document.getElementById("recommendResult")
);
const recommendTitle = /** @type {HTMLParagraphElement} */ (
  document.getElementById("recommendTitle")
);
const recommendAddress = /** @type {HTMLParagraphElement} */ (
  document.getElementById("recommendAddress")
);
const recommendReason = /** @type {HTMLParagraphElement} */ (
  document.getElementById("recommendReason")
);
const recommendMapLink = /** @type {HTMLAnchorElement} */ (
  document.getElementById("recommendMapLink")
);
const recommendStopsSection = /** @type {HTMLDivElement} */ (
  document.getElementById("recommendStopsSection")
);
const recommendStops = /** @type {HTMLOListElement} */ (
  document.getElementById("recommendStops")
);
const recommendSources = /** @type {HTMLUListElement} */ (
  document.getElementById("recommendSources")
);
const recommendButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("recommendButton")
);
const recommendButtonLabel = recommendButton.textContent || "";
const originAreaSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("originAreaSelect")
);
const originRegionSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("originRegionSelect")
);
const originRegionButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("originRegionButton")
);
const originRegionHint = /** @type {HTMLParagraphElement} */ (
  document.getElementById("originRegionHint")
);

const DEFAULT_WALK_TARGET_MINUTES = 60;
const WALK_ROUTE_MAX_RETRIES = 4;
const DEFAULT_ORIGIN_REGION_HINT =
  "地方または都道府県を選択して開始できます。";
/** @type {Record<string, { prefectures: string[], anchor: string }>} */
const REGION_GROUPS = {
  北海道地方: { prefectures: ["北海道"], anchor: "札幌" },
  東北地方: {
    prefectures: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
    anchor: "仙台",
  },
  関東地方: {
    prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
    anchor: "東京",
  },
  中部地方: {
    prefectures: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"],
    anchor: "名古屋",
  },
  近畿地方: {
    prefectures: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
    anchor: "大阪",
  },
  中国地方: {
    prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
    anchor: "広島",
  },
  四国地方: {
    prefectures: ["徳島県", "香川県", "愛媛県", "高知県"],
    anchor: "高松",
  },
  九州地方: {
    prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"],
    anchor: "福岡",
  },
  沖縄地方: { prefectures: ["沖縄県"], anchor: "那覇" },
};
const STATION_TYPES = new Set([
  "train_station",
  "transit_station",
  "subway_station",
  "light_rail_station",
]);
const REGION_STATION_QUERIES = ["駅", "JR駅", "主要駅", "中心駅", "代表駅"];
/** @type {Record<string, string>} */
const REGION_QUERY_EXCEPTIONS = {
  北海道: "札幌",
  沖縄県: "那覇",
};
const MAX_STATION_QUERIES = 12;

/** @type {any} */
let map = null;
/** @type {any} */
let directionsService = null;
/** @type {any} */
let walkingRenderer = null;
/** @type {any} */
let railRenderer = null;
/** @type {any} */
let originMarker = null;
/** @type {any} */
let destinationMarker = null;
/** @type {any} */
let originLatLng = null;
/** @type {any} */
let destinationLatLng = null;
let destinationName = "";
let requestId = 0;
/** @type {any} */
let geocoder = null;
/** @type {string | null} */
let destinationSource = null;
/** @type {string | null} */
let originRegion = null;
/** @type {Array<any> | null} */
let walkingWaypoints = null;
/** @type {number | null} */
let walkRouteTargetMinutes = null;
let walkRouteRetryCount = 0;
let lastWalkQuery = "";
/** @type {number | null} */
let desiredWalkTargetMinutes = null;
/** @type {string | null} */
let walkRoutePreferredMode = null;
let areaAnchorCache = "";
let areaAnchorSelection = "";

/**
 * @param {string} label
 * @param {string} state
 */
function setStatus(label, state) {
  keyStatus.textContent = label;
  statusCard.dataset["state"] = state;
}

/**
 * @param {string} message
 * @param {boolean} visible
 */
function setOverlay(message, visible) {
  overlay.textContent = message;
  overlay.classList.toggle("visible", visible);
}

/**
 * @param {any} latLng
 * @returns {string}
 */
function formatLatLng(latLng) {
  return `${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
}

function updateRouteLabels() {
  originLabel.textContent = originLatLng ? formatLatLng(originLatLng) : "未選択";
  destinationLabel.textContent = destinationLatLng
    ? formatLatLng(destinationLatLng)
    : "未選択";
}

function updateRouteHint() {
  if (!originLatLng) {
    routeHint.textContent = "マップをクリックして出発地を選択してください。";
    return;
  }

  if (!destinationLatLng) {
    routeHint.textContent = "次に目的地を選択してください。";
    return;
  }

  routeHint.textContent = "2点が選択されています。必要ならリセットで再選択できます。";
}

/**
 * @param {string} message
 */
function setOriginRegionHint(message) {
  if (originRegionHint) {
    originRegionHint.textContent = message;
  }
}

function updateRegionControls() {
  if (!originRegionButton || !originRegionHint) {
    return;
  }
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
 * @param {string} message
 */
function setRouteStatus(message) {
  routeStatus.textContent = message;
}

function updateRouteLinks() {
  if (!originLatLng || !destinationLatLng) {
    routeLinks.hidden = true;
    walkingRouteLink.hidden = true;
    railRouteLink.hidden = true;
    walkingRouteLink.href = "#";
    railRouteLink.href = "#";
    return;
  }

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

  const showRailLink =
    destinationSource !== "walk_multi" || walkRoutePreferredMode === "rail";
  if (showRailLink) {
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

/**
 * @param {any} components
 * @returns {string | null}
 */
function extractRegionFromComponents(components) {
  if (!Array.isArray(components)) {
    return null;
  }
  const findPart = (/** @type {string} */ type) =>
    components.find((/** @type {any} */ component) =>
      component.types?.includes(type)
    )?.long_name;
  const prefecture = findPart("administrative_area_level_1");
  const locality = findPart("locality") || findPart("sublocality_level_1");
  const sublocality = findPart("sublocality_level_2");
  const parts = [prefecture, locality, sublocality].filter(Boolean);
  return parts.length ? parts.join("") : null;
}

/**
 * @param {any} region
 * @returns {string[]}
 */
function normalizeRegionFilter(region) {
  if (!region) {
    return [];
  }
  if (Array.isArray(region)) {
    return region.filter(Boolean);
  }
  if (typeof region === "string") {
    return region
      .split(/[、,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * @param {string} regionName
 * @param {any} context
 * @returns {boolean}
 */
function isRegionMatch(regionName, context) {
  if (!regionName || !context) {
    return true;
  }
  const filters = normalizeRegionFilter(
    Array.isArray(context.prefectures) && context.prefectures.length > 0
      ? context.prefectures
      : context.label
  );
  if (!filters.length) {
    return true;
  }
  return filters.some((filter) => regionName.includes(filter));
}

/**
 * @param {any} latLng
 * @param {any} context
 * @returns {Promise<boolean>}
 */
async function resolveIsOriginInRegion(latLng, context) {
  if (!latLng || !context) {
    return true;
  }
  const regionName = await resolveOriginRegion(latLng);
  if (regionName) {
    return isRegionMatch(regionName, context);
  }
  if (originRegion) {
    return isRegionMatch(originRegion, context);
  }
  return false;
}

/**
 * @param {any[]} list
 * @returns {string}
 */
function pickRandomItem(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return "";
  }
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

/**
 * @param {string} areaValue
 * @param {boolean} refreshAnchor
 * @returns {string}
 */
function getAreaAnchor(areaValue, refreshAnchor) {
  if (!areaValue || !REGION_GROUPS[areaValue]) {
    return "";
  }
  const group = REGION_GROUPS[areaValue];
  if (areaValue !== areaAnchorSelection || refreshAnchor) {
    if (areaValue === "関東地方") {
      areaAnchorCache = pickRandomItem(group.prefectures) || group.anchor;
    } else {
      areaAnchorCache = group.anchor;
    }
    areaAnchorSelection = areaValue;
  }
  return areaAnchorCache;
}

/**
 * @param {{ refreshAnchor?: boolean }} [options]
 * @returns {any}
 */
function getSelectedRegionContext(options = {}) {
  const refreshAnchor = Boolean(options.refreshAnchor);
  const areaValue = originAreaSelect?.value?.trim();
  if (areaValue && REGION_GROUPS[areaValue]) {
    const group = REGION_GROUPS[areaValue];
    return {
      label: areaValue,
      prefectures: group.prefectures,
      anchor: getAreaAnchor(areaValue, refreshAnchor),
    };
  }
  const prefValue = originRegionSelect?.value?.trim();
  if (prefValue) {
    return {
      label: prefValue,
      prefectures: [prefValue],
      anchor: prefValue,
    };
  }
  return null;
}

/**
 * @param {any} context
 * @returns {string}
 */
function formatRegionForPrompt(context) {
  if (!context) {
    return "";
  }
  return context.label;
}

/**
 * @param {any} latLng
 * @returns {Promise<string | null>}
 */
function resolveOriginRegion(latLng) {
  return new Promise((resolve) => {
    if (!geocoder || !latLng) {
      resolve(null);
      return;
    }
    geocoder.geocode(
      { location: latLng },
      (/** @type {any} */ results, /** @type {any} */ status) => {
      if (status !== "OK" || !results?.[0]) {
        resolve(null);
        return;
      }
      const region =
        extractRegionFromComponents(results[0].address_components) ||
        results[0].formatted_address ||
        null;
      resolve(region);
      }
    );
  });
}

function getMaxMinutes() {
  const value = Number.parseInt(maxTimeInput.value, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function getTargetMinutes() {
  return getMaxMinutes() || DEFAULT_WALK_TARGET_MINUTES;
}

function updateLimitHint() {
  const maxMinutes = getMaxMinutes();
  limitHint.textContent = maxMinutes
    ? `所要時間の上限は${maxMinutes}分です。`
    : `未入力なら制限なし（空欄検索は${DEFAULT_WALK_TARGET_MINUTES}分目安）`;
}

/**
 * @param {string} message
 */
function setRecommendHint(message) {
  recommendHint.textContent = message;
}

/**
 * @param {boolean} loading
 */
function setRecommendLoading(loading) {
  recommendButton.disabled = loading;
  recommendQuery.disabled = loading;
  recommendButton.textContent = loading
    ? "検索中..."
    : recommendButtonLabel;
}

function clearRecommendResult() {
  recommendTitle.textContent = "-";
  recommendAddress.textContent = "-";
  recommendReason.textContent = "-";
  recommendMapLink.href = "#";
  recommendMapLink.hidden = true;
  recommendStops.textContent = "";
  recommendStopsSection.hidden = true;
  recommendSources.textContent = "";
  recommendResult.hidden = true;
}

/**
 * @param {any} stops
 */
function renderStops(stops) {
  recommendStops.textContent = "";
  if (!Array.isArray(stops) || stops.length === 0) {
    recommendStopsSection.hidden = true;
    return;
  }
  stops.forEach((stop) => {
    const item = document.createElement("li");
    if (typeof stop === "string") {
      const link = document.createElement("a");
      link.href = buildMapsLink(stop);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.className = "map-link";
      link.textContent = stop;
      item.appendChild(link);
    } else if (stop && typeof stop === "object") {
      const name = stop.name || stop.title || "";
      const address = stop.address || "";
      const label = [name, address].filter(Boolean).join(" ");
      const link = document.createElement("a");
      link.href = buildMapsLink(label);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.className = "map-link";
      link.textContent = label || "不明";
      item.appendChild(link);
    } else {
      item.textContent = "不明";
    }
    recommendStops.appendChild(item);
  });
  recommendStopsSection.hidden = false;
}

/**
 * @param {any} sources
 */
function renderSources(sources) {
  recommendSources.textContent = "";
  if (!Array.isArray(sources) || sources.length === 0) {
    const item = document.createElement("li");
    item.textContent = "参照なし";
    recommendSources.appendChild(item);
    return;
  }

  sources.forEach((source) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const url = typeof source === "string" ? source : source.url;
    const title =
      typeof source === "string" ? source : source.title || source.url;
    if (!url) {
      item.textContent = title || "参照なし";
      recommendSources.appendChild(item);
      return;
    }
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = title || url;
    item.appendChild(link);
    recommendSources.appendChild(item);
  });
}

/**
 * @param {string} query
 * @returns {string}
 */
function buildMapsLink(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

/**
 * @param {any} latLng
 * @returns {string}
 */
function formatLatLngForUrl(latLng) {
  if (!latLng) {
    return "";
  }
  if (typeof latLng === "string") {
    return latLng;
  }
  if (typeof latLng.toUrlValue === "function") {
    return latLng.toUrlValue(6);
  }
  return `${latLng.lat().toFixed(6)},${latLng.lng().toFixed(6)}`;
}

/**
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatDurationText(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) {
    return "不明";
  }
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes}分`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${minutes}分`;
}

/**
 * @param {any[]} legs
 * @returns {{ text: string, seconds: number | null }}
 */
function getRouteDurationFromLegs(legs) {
  if (!Array.isArray(legs) || legs.length === 0) {
    return { text: "不明", seconds: null };
  }
  let totalSeconds = 0;
  let hasSeconds = false;
  legs.forEach((leg) => {
    const value = leg?.duration?.value;
    if (typeof value === "number") {
      totalSeconds += value;
      hasSeconds = true;
    }
  });
  if (hasSeconds) {
    return { text: formatDurationText(totalSeconds), seconds: totalSeconds };
  }
  const fallbackText = legs[0]?.duration?.text;
  return { text: fallbackText || "不明", seconds: null };
}

/**
 * @param {any} latLng
 * @returns {{ lat: number, lng: number } | null}
 */
function getLatLngLiteral(latLng) {
  if (!latLng) {
    return null;
  }
  if (typeof latLng.lat === "function") {
    return { lat: latLng.lat(), lng: latLng.lng() };
  }
  if (typeof latLng.lat === "number" && typeof latLng.lng === "number") {
    return { lat: latLng.lat, lng: latLng.lng };
  }
  return null;
}

/**
 * @param {any} a
 * @param {any} b
 * @returns {number | null}
 */
function computeDistanceMeters(a, b) {
  if (!a || !b) {
    return null;
  }
  const toRadians = (/** @type {number} */ value) => (value * Math.PI) / 180;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b.lng - a.lng);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildDirectionsLink(
  /** @type {{ origin: any, destination: any, travelMode?: any, waypoints?: any, transitMode?: any }} */
  { origin, destination, travelMode, waypoints, transitMode }
) {
  const params = new URLSearchParams({ api: "1" });
  const originValue = formatLatLngForUrl(origin);
  const destinationValue = formatLatLngForUrl(destination);
  if (originValue) {
    params.set("origin", originValue);
  }
  if (destinationValue) {
    params.set("destination", destinationValue);
  }
  if (travelMode) {
    params.set("travelmode", travelMode);
  }
  if (transitMode) {
    params.set("transit_mode", transitMode);
  }
  if (Array.isArray(waypoints) && waypoints.length > 0) {
    const waypointValues = waypoints
      .map((point) => formatLatLngForUrl(point))
      .filter(Boolean);
    if (waypointValues.length) {
      params.set("waypoints", waypointValues.join("|"));
    }
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const GENERIC_POINT_LABELS = new Set(["出発地", "目的地", "未選択", "不明"]);

/**
 * @param {any} label
 * @returns {string}
 */
function normalizePointLabel(label) {
  if (typeof label !== "string") {
    return "";
  }
  const trimmed = label.trim();
  if (!trimmed || GENERIC_POINT_LABELS.has(trimmed)) {
    return "";
  }
  return trimmed;
}

function buildSegmentSearchQuery(
  /** @type {{ fromLabel?: any, toLabel?: any, from?: any, to?: any }} */
  { fromLabel, toLabel, from, to }
) {
  const labels = [normalizePointLabel(fromLabel), normalizePointLabel(toLabel)].filter(
    Boolean
  );
  if (labels.length) {
    return labels.join(" ");
  }
  const fromValue = formatLatLngForUrl(from);
  const toValue = formatLatLngForUrl(to);
  return [fromValue, toValue].filter(Boolean).join(" ");
}

function getOriginDisplayLabel() {
  if (originRegion) {
    return originRegion;
  }
  return "出発地";
}

function getDestinationDisplayLabel() {
  if (destinationName) {
    return destinationName;
  }
  return destinationLatLng ? "目的地" : "";
}

/**
 * @param {any} result
 * @returns {any}
 */
function extractTransitStops(result) {
  const route = result?.routes?.[0];
  if (!route) {
    return null;
  }
  /** @type {any[]} */
  const transitSteps = [];
  const transitMode =
    (typeof google !== "undefined" &&
      google.maps &&
      google.maps.TravelMode &&
      google.maps.TravelMode.TRANSIT) ||
    "TRANSIT";
  (route.legs || []).forEach((/** @type {any} */ leg) => {
    (leg.steps || []).forEach((/** @type {any} */ step) => {
      if (step.travel_mode === transitMode || step.travel_mode === "TRANSIT") {
        transitSteps.push(step);
      }
    });
  });
  if (!transitSteps.length) {
    return null;
  }
  const first = transitSteps[0].transit;
  const last = transitSteps[transitSteps.length - 1].transit;
  const departure = first?.departure_stop || null;
  const arrival = last?.arrival_stop || null;
  if (!departure?.location || !arrival?.location) {
    return null;
  }
  return { departure, arrival };
}

function buildWalkSegment(
  /** @type {{ origin: any, destination: any, fromLabel?: any, toLabel?: any, waypoints?: any }} */
  { origin, destination, fromLabel, toLabel, waypoints }
) {
  if (!origin || !destination) {
    return null;
  }
  const meta =
    fromLabel && toLabel ? `${fromLabel} → ${toLabel}` : "";
  return {
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

function buildRailSegment(
  /** @type {{ origin: any, destination: any, fromLabel?: any, toLabel?: any }} */
  { origin, destination, fromLabel, toLabel }
) {
  if (!origin || !destination) {
    return null;
  }
  const title =
    fromLabel && toLabel ? `${fromLabel}〜${toLabel}` : "在来線ルート";
  return {
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

function clearRouteBreakdown() {
  if (!routeBreakdown || !routeBreakdownList) {
    return;
  }
  routeBreakdownList.textContent = "";
  routeBreakdown.hidden = true;
}

/**
 * @param {any} segments
 */
function renderRouteBreakdown(segments) {
  if (!routeBreakdown || !routeBreakdownList) {
    return;
  }
  routeBreakdownList.textContent = "";
  if (!Array.isArray(segments) || segments.length === 0) {
    routeBreakdown.hidden = true;
    return;
  }

  segments.forEach((segment) => {
    if (!segment) {
      return;
    }
    const item = document.createElement("li");
    item.className = "segment-item";

    const header = document.createElement("div");
    header.className = "segment-header";

    const title = document.createElement("p");
    title.className = "segment-title";
    title.textContent = segment.title || "区間";
    header.appendChild(title);

    if (segment.meta) {
      const meta = document.createElement("p");
      meta.className = "segment-meta";
      meta.textContent = segment.meta;
      header.appendChild(meta);
    }

    const links = document.createElement("div");
    links.className = "segment-links";

    const directionsLink = buildDirectionsLink({
      origin: segment.origin,
      destination: segment.destination,
      travelMode: segment.travelMode,
      waypoints: segment.waypoints,
      transitMode: segment.transitMode,
    });

    if (directionsLink) {
      const link = document.createElement("a");
      link.className = "map-link";
      link.href = directionsLink;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = segment.linkLabel || "Google Mapsでルートを見る";
      links.appendChild(link);
    }

    const searchQuery = buildSegmentSearchQuery({
      fromLabel: segment.fromLabel,
      toLabel: segment.toLabel,
      from: segment.origin,
      to: segment.destination,
    });
    if (searchQuery) {
      const searchLink = document.createElement("a");
      searchLink.className = "map-link";
      searchLink.href = buildMapsLink(searchQuery);
      searchLink.target = "_blank";
      searchLink.rel = "noreferrer";
      searchLink.textContent = "Google Mapsで検索";
      links.appendChild(searchLink);
    }

    item.appendChild(header);
    if (links.children.length) {
      item.appendChild(links);
    }
    routeBreakdownList.appendChild(item);
  });

  routeBreakdown.hidden = false;
}

function buildRouteBreakdownSegments(
  /** @type {{ mode?: any, railResult?: any }} */ { mode, railResult }
) {
  if (!originLatLng || !destinationLatLng) {
    return [];
  }

  const originDisplayLabel = getOriginDisplayLabel();
  const destinationDisplayLabel = getDestinationDisplayLabel();
  const waypointPoints = Array.isArray(walkingWaypoints)
    ? walkingWaypoints.map((waypoint) => waypoint.location).filter(Boolean)
    : [];

  if (mode === "rail") {
    const transitStops = extractTransitStops(railResult);
    if (transitStops) {
      const departureLabel = transitStops.departure?.name || "出発駅";
      const arrivalLabel = transitStops.arrival?.name || "到着駅";
      const firstWalk = buildWalkSegment({
        origin: originLatLng,
        destination: transitStops.departure.location,
        fromLabel: originDisplayLabel,
        toLabel: departureLabel,
      });
      const railSegment = buildRailSegment({
        origin: transitStops.departure.location,
        destination: transitStops.arrival.location,
        fromLabel: departureLabel,
        toLabel: arrivalLabel,
      });
      const lastWalk = buildWalkSegment({
        origin: transitStops.arrival.location,
        destination: destinationLatLng,
        fromLabel: arrivalLabel,
        toLabel: destinationDisplayLabel,
      });
      return [firstWalk, railSegment, lastWalk].filter(Boolean);
    }
  }

  const walkSegment = buildWalkSegment({
    origin: originLatLng,
    destination: destinationLatLng,
    fromLabel: originDisplayLabel,
    toLabel: destinationDisplayLabel,
    waypoints: mode === "walk" && waypointPoints.length ? waypointPoints : null,
  });
  return walkSegment ? [walkSegment] : [];
}

function updateRouteBreakdown(
  /** @type {{ mode?: any, railResult?: any }} */ { mode, railResult }
) {
  const segments = buildRouteBreakdownSegments({ mode, railResult });
  if (!segments.length) {
    clearRouteBreakdown();
    return;
  }
  renderRouteBreakdown(segments);
}

/**
 * @param {any} result
 * @returns {boolean}
 */
function isStationResult(result) {
  const types = result?.types;
  if (!Array.isArray(types)) {
    return false;
  }
  return types.some((type) => STATION_TYPES.has(type));
}

/**
 * @param {any} result
 * @param {any} region
 * @returns {boolean}
 */
function isResultInRegion(result, region) {
  const regionFilters = normalizeRegionFilter(region);
  if (!regionFilters.length) {
    return true;
  }
  const regionName = extractRegionFromComponents(
    result?.address_components || []
  );
  if (
    regionName &&
    regionFilters.some((filter) => regionName.includes(filter))
  ) {
    return true;
  }
  const formatted = result?.formatted_address || "";
  return regionFilters.some((filter) => formatted.includes(filter));
}

/**
 * @param {any} result
 * @returns {string}
 */
function extractStationLabel(result) {
  const components = result?.address_components || [];
  const labelComponent = components.find((/** @type {any} */ component) =>
    component.types?.some((/** @type {string} */ type) =>
      ["transit_station", "point_of_interest", "establishment", "premise"].includes(
        type
      )
    )
  );
  return labelComponent?.long_name || "";
}

/**
 * @param {string} region
 * @returns {string}
 */
function stripRegionSuffix(region) {
  if (!region) {
    return "";
  }
  const value = Array.isArray(region) ? region.find(Boolean) : region;
  if (typeof value !== "string" || !value) {
    return "";
  }
  if (value === "北海道") {
    return value;
  }
  return value.replace(/[都府県]$/, "");
}

/**
 * @param {string} region
 * @returns {string}
 */
function getRegionLabel(region) {
  if (!region) {
    return "";
  }
  if (Array.isArray(region)) {
    return region.find(Boolean) || "";
  }
  return typeof region === "string" ? region : "";
}

/**
 * @param {string} region
 * @returns {string[]}
 */
function buildRegionStationQueries(region) {
  const trimmed = region.trim();
  if (!trimmed) {
    return [];
  }
  const variants = [trimmed];
  const exception = REGION_QUERY_EXCEPTIONS[trimmed];
  if (exception) {
    variants.push(exception);
  }
  const stripped = stripRegionSuffix(trimmed);
  if (stripped && stripped !== trimmed) {
    variants.push(stripped);
  }
  /** @type {string[]} */
  const queries = [];
  variants.forEach((variant) => {
    REGION_STATION_QUERIES.forEach((suffix) => {
      queries.push(`${variant} ${suffix}`);
      queries.push(`${variant}${suffix}`);
    });
  });
  return [...new Set(queries)];
}

/**
 * @param {any} result
 * @returns {boolean}
 */
function resultHasStationKeyword(result) {
  const label = extractStationLabel(result);
  if (label && label.includes("駅")) {
    return true;
  }
  if (result?.formatted_address?.includes("駅")) {
    return true;
  }
  const components = result?.address_components || [];
  return components.some(
    (/** @type {any} */ component) => component.long_name?.includes("駅")
  );
}

/**
 * @param {any} components
 * @returns {string[]}
 */
function extractLocalityCandidates(components) {
  if (!Array.isArray(components)) {
    return [];
  }
  const types = [
    "locality",
    "administrative_area_level_2",
    "sublocality_level_1",
    "sublocality_level_2",
  ];
  /** @type {string[]} */
  const names = [];
  types.forEach((type) => {
    const name = components.find((/** @type {any} */ component) =>
      component.types?.includes(type)
    )?.long_name;
    if (name) {
      names.push(name);
    }
  });
  return [...new Set(names)];
}

/**
 * @param {any} latLng
 * @returns {Promise<string[]>}
 */
function resolveLocalityCandidates(latLng) {
  return new Promise((resolve) => {
    if (!geocoder || !latLng) {
      resolve([]);
      return;
    }
    geocoder.geocode(
      { location: latLng },
      (/** @type {any} */ results, /** @type {any} */ status) => {
      if (status !== "OK" || !results?.[0]) {
        resolve([]);
        return;
      }
      resolve(extractLocalityCandidates(results[0].address_components));
      }
    );
  });
}

/**
 * @returns {string[]}
 */
function buildStartStationQueries(
  /** @type {{ region?: any, stopName?: any, localities?: any }} */
  { region, stopName, localities }
) {
  /** @type {Set<string>} */
  const queries = new Set();
  const addStationQuery = (/** @type {string} */ value) => {
    if (!value) {
      return;
    }
    queries.add(`${value} 駅`);
    queries.add(`${value}駅`);
  };
  if (stopName) {
    addStationQuery(stopName);
    queries.add(`${stopName} 最寄り駅`);
  }
  /** @type {string[]} */
  const localityList = Array.isArray(localities) ? localities : [];
  localityList.forEach(addStationQuery);
  const regionLabel = getRegionLabel(region);
  if (regionLabel) {
    addStationQuery(regionLabel);
    const stripped = stripRegionSuffix(regionLabel);
    if (stripped && stripped !== regionLabel) {
      addStationQuery(stripped);
    }
    localityList.slice(0, 2).forEach((locality) => {
      addStationQuery(`${regionLabel} ${locality}`);
      if (stripped) {
        addStationQuery(`${stripped} ${locality}`);
      }
    });
  }
  return [...queries];
}

/**
 * @param {string} address
 * @returns {Promise<any[]>}
 */
function geocodeByAddress(address) {
  return new Promise((resolve) => {
    if (!geocoder || !address) {
      resolve([]);
      return;
    }
    geocoder.geocode(
      { address },
      (/** @type {any} */ results, /** @type {any} */ status) => {
      if (status === "OK" && Array.isArray(results)) {
        resolve(results);
        return;
      }
      resolve([]);
      }
    );
  });
}

/**
 * @param {any} results
 * @param {any} region
 * @returns {any[]}
 */
function filterStationResults(results, region) {
  const list = Array.isArray(results) ? results : [];
  if (!list.length) {
    return [];
  }
  const hasRegionFilter = normalizeRegionFilter(region).length > 0;
  const stationResults = list.filter(isStationResult);
  const regionStations = stationResults.filter((result) =>
    isResultInRegion(result, region)
  );
  if (regionStations.length) {
    return regionStations;
  }
  if (!hasRegionFilter && stationResults.length) {
    return stationResults;
  }

  const keywordResults = list.filter(resultHasStationKeyword);
  const regionKeywords = keywordResults.filter((result) =>
    isResultInRegion(result, region)
  );
  if (regionKeywords.length) {
    return regionKeywords;
  }
  return hasRegionFilter ? [] : keywordResults;
}

/**
 * @param {any} results
 * @param {any} region
 * @returns {any}
 */
function selectStationResult(results, region) {
  const filtered = filterStationResults(results, region);
  return filtered[0] || null;
}

/**
 * @param {string} region
 * @returns {Promise<any>}
 */
async function findStationInRegion(region) {
  if (!geocoder || !region) {
    return null;
  }
  const queries = buildRegionStationQueries(region);
  for (const query of queries) {
    const results = await geocodeByAddress(query);
    const selected = selectStationResult(results, region);
    if (selected?.geometry?.location) {
      return {
        location: selected.geometry.location,
        name: extractStationLabel(selected),
        address: selected.formatted_address || "",
      };
    }
  }
  return null;
}

/**
 * @param {any} result
 * @returns {string}
 */
function getStationNameFromResult(result) {
  if (!result) {
    return "";
  }
  return (
    result.name ||
    extractStationLabel(result) ||
    result.formatted_address ||
    ""
  );
}

/**
 * @param {string} region
 * @returns {Promise<any>}
 */
async function resolveRegionAnchor(region) {
  if (!region) {
    return null;
  }
  try {
    return await geocodeAddress(region);
  } catch (error) {
    return null;
  }
}

async function findNearestStationToLocation(
  /** @type {{ startLocation?: any, stopName?: any, region?: any }} */
  { startLocation, stopName, region }
) {
  if (!geocoder || !startLocation) {
    return null;
  }
  const localities = await resolveLocalityCandidates(startLocation);
  const queries = buildStartStationQueries({
    region,
    stopName,
    localities,
  }).slice(0, MAX_STATION_QUERIES);
  if (!queries.length) {
    return null;
  }
  const startLiteral = getLatLngLiteral(startLocation);
  if (!startLiteral) {
    return null;
  }

  /** @type {Array<{ result: any, distance: number }>} */
  const candidates = [];
  for (const query of queries) {
    const results = await geocodeByAddress(query);
    const filtered = filterStationResults(results, region);
    filtered.forEach((result) => {
      const locationLiteral = getLatLngLiteral(result?.geometry?.location);
      if (!locationLiteral) {
        return;
      }
      const distance = computeDistanceMeters(startLiteral, locationLiteral);
      if (distance === null) {
        return;
      }
      candidates.push({ result, distance });
    });
  }

  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const best = candidates[0];
  if (!best) {
    return null;
  }
  return {
    location: best.result?.geometry?.location || null,
    name: getStationNameFromResult(best.result),
    address: best.result?.formatted_address || "",
  };
}

async function ensureOriginFromRegion(
  /** @type {{ source?: string }} */ { source } = {}
) {
  if (originLatLng) {
    return true;
  }
  if (!originRegionHint) {
    if (source === "recommend") {
      setRecommendHint("先に出発地を選択してください。");
    }
    return false;
  }
  const context = getSelectedRegionContext({ refreshAnchor: true });
  if (!context?.label) {
    setOriginRegionHint("地方または都道府県を選択してください。");
    if (source === "recommend") {
      setRecommendHint(
        "地方または都道府県を選択するか、地図をクリックして出発地を指定してください。"
      );
    }
    return false;
  }
  const regionLabel = context.label;
  const regionFilter = context.prefectures || context.label;
  setOriginRegionHint(`${regionLabel}の駅を探しています...`);

  let station = null;
  if (context.anchor) {
    const anchorLocation = await resolveRegionAnchor(context.anchor);
    if (anchorLocation) {
      station = await findNearestStationToLocation({
        startLocation: anchorLocation,
        stopName: context.anchor,
        region: regionFilter,
      });
    }
  }
  if (!station?.location) {
    station = await findStationInRegion(regionLabel);
  }
  if (!station?.location && context.anchor) {
    station = await findStationInRegion(context.anchor);
  }
  if (!station?.location) {
    setOriginRegionHint("地域内の駅が見つかりませんでした。");
    if (source === "recommend") {
      setRecommendHint(
        "地域内の駅が見つからないため出発地を指定できません。"
      );
    }
    return false;
  }
  setOrigin(station.location, regionLabel);
  updateRouteLabels();
  updateRouteHint();
  if (map && station.location) {
    map.panTo(station.location);
    map.setZoom(Math.max(DEFAULT_ZOOM, map.getZoom() || DEFAULT_ZOOM));
  }
  const stationLabel = station.name
    ? `${station.name}から開始しました。`
    : "駅から開始しました。";
  setOriginRegionHint(`${regionLabel}内の${stationLabel}`);
  if (source === "recommend") {
    setRecommendHint("地域の駅を出発地に設定しました。");
  }
  return true;
}

async function handleOriginRegionStart() {
  if (originLatLng) {
    setOriginRegionHint(
      "出発地が選択済みです。リセットすると地域指定が使えます。"
    );
    return;
  }
  await ensureOriginFromRegion({ source: "manual" });
}

/**
 * @param {number | null} targetMinutes
 * @param {number | null} durationMinutes
 * @returns {number | null}
 */
function getAdjustedTargetMinutes(targetMinutes, durationMinutes) {
  if (!targetMinutes || !durationMinutes) {
    return targetMinutes;
  }
  if (durationMinutes < targetMinutes) {
    const diff = targetMinutes - durationMinutes;
    return Math.min(
      Math.round(targetMinutes * 1.5),
      targetMinutes + Math.max(20, Math.round(diff * 0.8))
    );
  }
  const diff = durationMinutes - targetMinutes;
  return Math.max(20, targetMinutes - Math.max(15, Math.round(diff * 0.6)));
}

async function runWalkRouteSearch(
  /** @type {{ query?: any, requestTargetMinutes?: any, desiredTargetMinutes?: any, adjustment?: any, actualMinutes?: any, auto?: boolean }} */
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
  walkRoutePreferredMode = null;

  try {
    const regionContext = getSelectedRegionContext({ refreshAnchor: !auto });
    const originMismatch =
      originLatLng && regionContext
        ? !(await resolveIsOriginInRegion(originLatLng, regionContext))
        : false;
    const originMissing = !originLatLng || originMismatch;
    const regionLabel =
      regionContext?.label || originRegion || "";
    const regionFilter = Array.isArray(regionContext?.prefectures)
      ? regionContext.prefectures
      : regionLabel
        ? [regionLabel]
        : [];
    const regionForPrompt = formatRegionForPrompt(regionContext) || regionLabel;
    const regionAnchor = regionContext?.anchor || regionLabel;
    let originOverride = null;
    let originRegionOverride = null;
    if (originMissing) {
      if (originMismatch) {
        setOriginRegionHint(
          "選択した地域に合わせて出発地を再設定しています..."
        );
      }
      originRegionOverride = regionForPrompt;
      if (!originRegionOverride) {
        throw new Error("地方または都道府県を選択してください。");
      }
      originOverride = await resolveRegionAnchor(
        regionAnchor || originRegionOverride
      );
      if (!originOverride) {
        throw new Error("地域の中心座標が取得できませんでした。");
      }
      if (originMismatch) {
        setOrigin(originOverride, regionLabel || originRegionOverride, {
          preserveWalkState: true,
        });
        updateRouteLabels();
        updateRouteHint();
      }
    }

    const data = await requestRecommendation({
      query,
      mode: "walk_route",
      targetMinutes: requestTargetMinutes,
      adjustment,
      actualMinutes,
      originOverride,
      originRegionOverride,
      originPrefectures: regionContext?.prefectures,
      originAreaLabel: regionContext?.label,
    });
    if (!data?.place) {
      throw new Error("おすすめ地点の取得に失敗しました。");
    }
    showRecommendResult(data.place);

    const locations = await geocodeStops(data.place.stops);
    if (locations.length < 2) {
      throw new Error("散歩ルートの地点を見つけられませんでした。");
    }
    const startLocation = locations[0];
    const startStop = Array.isArray(data.place.stops) ? data.place.stops[0] : null;
    const startStopName =
      typeof startStop === "string"
        ? startStop
        : startStop?.name || startStop?.title || "";

    let originUsesStartLocation = false;
    if (originMissing) {
      const station = await findNearestStationToLocation({
        startLocation,
        stopName: startStopName,
        region: regionFilter.length ? regionFilter : originRegionOverride,
      });
      if (station?.location) {
        setOrigin(station.location, regionLabel || originRegionOverride, {
          preserveWalkState: true,
        });
        setOriginRegionHint(
          station.name
            ? `${station.name}を出発地に設定しました。`
            : "最寄り駅を出発地に設定しました。"
        );
      } else {
        setOrigin(startLocation, regionLabel || originRegionOverride, {
          preserveWalkState: true,
        });
        originUsesStartLocation = true;
        setOriginRegionHint(
          "最寄り駅が見つからないため最初の地点から開始します。"
        );
      }
    }

    const waypointStartIndex = originUsesStartLocation ? 1 : 0;
    walkingWaypoints = locations
      .slice(waypointStartIndex, -1)
      .map((location) => ({
        location,
        stopover: true,
      }));
    const endStop = Array.isArray(data.place.stops)
      ? data.place.stops[data.place.stops.length - 1]
      : null;
    const endStopLabel =
      getStopLabel(endStop) || data.place?.address || data.place?.area || "";
    walkRouteTargetMinutes = desiredTargetMinutes;
    desiredWalkTargetMinutes = desiredTargetMinutes;
    setDestination(locations[locations.length - 1], "walk_multi", {
      label: endStopLabel,
    });
    updateRouteLabels();
    updateRouteHint();
    updateRouteLinks();
    calculateRoutes();
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

/**
 * @param {any} place
 */
function showRecommendResult(place) {
  const isWalkRoute =
    place?.route_type === "walk_multi" || Array.isArray(place?.stops);
  recommendTitle.textContent =
    place?.name || (isWalkRoute ? "おすすめ散歩ルート" : "名称不明");
  recommendAddress.textContent =
    place?.address || place?.area || (isWalkRoute ? "出発地周辺" : "住所不明");
  recommendReason.textContent = place?.reason || "理由は取得できませんでした。";
  const mapQuery = [place?.name, place?.address, place?.area]
    .filter(Boolean)
    .join(" ");
  if (mapQuery) {
    recommendMapLink.href = buildMapsLink(mapQuery);
    recommendMapLink.hidden = false;
  } else {
    recommendMapLink.href = "#";
    recommendMapLink.hidden = true;
  }
  renderStops(isWalkRoute ? place?.stops : null);
  renderSources(place?.sources);
  recommendResult.hidden = false;
}

async function requestRecommendation(
  /** @type {{ query?: any, mode?: any, targetMinutes?: any, adjustment?: any, actualMinutes?: any, originOverride?: any, originRegionOverride?: any, originPrefectures?: any, originAreaLabel?: any }} */
  {
    query,
    mode,
    targetMinutes,
    adjustment,
    actualMinutes,
    originOverride,
    originRegionOverride,
    originPrefectures,
    originAreaLabel,
  }
) {
  const maxMinutes = getMaxMinutes();
  const originSource = originOverride || originLatLng;
  const originLiteral = getLatLngLiteral(originSource);
  if (!originLiteral) {
    throw new Error("出発地の座標が不正です。");
  }
  let region =
    typeof originRegionOverride === "string"
      ? originRegionOverride.trim()
      : "";
  if (!region) {
    region = originRegion || (await resolveOriginRegion(originSource)) || "";
  }
  const context = getSelectedRegionContext();
  const selectedPrefectures =
    Array.isArray(originPrefectures) && originPrefectures.length > 0
      ? originPrefectures
      : Array.isArray(context?.prefectures)
        ? context.prefectures
        : [];
  const selectedAreaLabel =
    typeof originAreaLabel === "string" && originAreaLabel.trim()
      ? originAreaLabel.trim()
      : context?.label || "";
  originRegion = region;
  const localities = await resolveLocalityCandidates(originSource);
  const originLabelValue =
    (Array.isArray(localities) && localities[0]) || region || "";
  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      origin: {
        lat: originLiteral.lat,
        lng: originLiteral.lng,
      },
      originLabel: originLabelValue,
      originAreaLabel: selectedAreaLabel,
      originPrefectures: selectedPrefectures,
      maxMinutes,
      targetMinutes,
      mode,
      adjustment,
      actualMinutes,
      originRegion: region,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "おすすめ地点の取得に失敗しました。");
  }
  return data;
}

/**
 * @param {string} address
 * @returns {Promise<any>}
 */
function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    if (!geocoder || !address) {
      reject(new Error("住所の位置特定に失敗しました。"));
      return;
    }
    geocoder.geocode(
      { address },
      (/** @type {any} */ results, /** @type {any} */ status) => {
      if (status === "OK" && results?.[0]) {
        resolve(results[0].geometry.location);
        return;
      }
      reject(new Error("住所の位置特定に失敗しました。"));
      }
    );
  });
}

/**
 * @param {any} place
 * @returns {Promise<any>}
 */
function geocodeDestination(place) {
  const address = [place?.name, place?.address].filter(Boolean).join(" ");
  return geocodeAddress(address);
}

/**
 * @param {any} stop
 * @returns {any}
 */
function normalizeStop(stop) {
  if (typeof stop === "string") {
    return { name: stop, address: "" };
  }
  if (!stop || typeof stop !== "object") {
    return null;
  }
  return {
    name: stop.name || stop.title || "",
    address: stop.address || "",
    lat: stop.lat,
    lng: stop.lng,
  };
}

/**
 * @param {any} stop
 * @returns {string}
 */
function getStopLabel(stop) {
  const normalized = normalizeStop(stop);
  if (!normalized) {
    return "";
  }
  return [normalized.name, normalized.address].filter(Boolean).join(" ");
}

/**
 * @param {any} stops
 * @returns {Promise<any[]>}
 */
async function geocodeStops(stops) {
  if (!Array.isArray(stops)) {
    return [];
  }
  /** @type {any[]} */
  const locations = [];
  const limit = Math.min(stops.length, 6);
  for (let i = 0; i < limit; i += 1) {
    const normalized = normalizeStop(stops[i]);
    if (!normalized) {
      continue;
    }
    if (
      typeof normalized.lat === "number" &&
      typeof normalized.lng === "number"
    ) {
      locations.push(new google.maps.LatLng(normalized.lat, normalized.lng));
      continue;
    }
    const address = [normalized.name, normalized.address]
      .filter(Boolean)
      .join(" ");
    try {
      const location = await geocodeAddress(address);
      locations.push(location);
    } catch (error) {
      continue;
    }
  }
  return locations;
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function handleRecommendSubmit(event) {
  event.preventDefault();

  const query = recommendQuery.value.trim();
  const isWalkRoute = !query;
  const mode = isWalkRoute ? "walk_route" : "spot";
  const targetMinutes = isWalkRoute ? getTargetMinutes() : null;

  if (!originLatLng && !isWalkRoute) {
    const ready = await ensureOriginFromRegion({ source: "recommend" });
    if (!ready) {
      return;
    }
  }

  if (isWalkRoute) {
    if (!originLatLng && !getSelectedRegionContext()?.label) {
      setRecommendHint(
        "地方または都道府県を選択するか、地図をクリックして出発地を指定してください。"
      );
      return;
    }
    lastWalkQuery = query;
    walkRouteRetryCount = 0;
    desiredWalkTargetMinutes = targetMinutes;
    await runWalkRouteSearch({
      query,
      requestTargetMinutes: targetMinutes,
      desiredTargetMinutes: targetMinutes,
      adjustment: null,
      auto: false,
    });
    return;
  }

  setRecommendLoading(true);
  setRecommendHint("検索中です...");
  clearRecommendResult();

  try {
    const data = await requestRecommendation({ query, mode, targetMinutes });
    if (!data?.place) {
      throw new Error("おすすめ地点の取得に失敗しました。");
    }
    showRecommendResult(data.place);
    const location = await geocodeDestination(data.place);
    const destinationLabelValue = [data.place?.name, data.place?.address]
      .filter(Boolean)
      .join(" ");
    setDestination(location, "recommendation", { label: destinationLabelValue });
    updateRouteLabels();
    updateRouteHint();
    updateRouteLinks();
    calculateRoutes();
    setRecommendHint("おすすめ地点を目的地に設定しました。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setRecommendHint(message || "おすすめ地点の取得に失敗しました。");
  } finally {
    setRecommendLoading(false);
  }
}

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

function clearWalkRouteState() {
  walkingWaypoints = null;
  walkRouteTargetMinutes = null;
  walkRouteRetryCount = 0;
  lastWalkQuery = "";
  desiredWalkTargetMinutes = null;
  walkRoutePreferredMode = null;
}

/**
 * @param {string} message
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
 * @param {any} latLng
 * @param {string | null} [regionOverride]
 * @param {{ preserveWalkState?: boolean }} [options]
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
 * @param {any} latLng
 * @param {string} source
 * @param {{ label?: string }} [options]
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

/**
 * @param {any} route
 * @returns {boolean}
 */
function routeHasHighSpeedTrain(route) {
  const legs = route?.legs || [];
  const highSpeedType =
    google.maps.TransitVehicleType?.HIGH_SPEED_TRAIN || "HIGH_SPEED_TRAIN";
  return legs.some((/** @type {any} */ leg) =>
    leg.steps?.some((/** @type {any} */ step) => {
      const travelMode = step.travel_mode;
      if (
        travelMode !== google.maps.TravelMode.TRANSIT &&
        travelMode !== "TRANSIT"
      ) {
        return false;
      }
      const vehicleType = step.transit?.line?.vehicle?.type;
      return vehicleType === highSpeedType;
    })
  );
}

/**
 * @param {any} result
 * @returns {{ route: any, reason: string | null }}
 */
function selectLocalRailRoute(result) {
  const routes = result?.routes || [];
  if (!routes.length) {
    return { route: null, reason: "no_route" };
  }
  for (const route of routes) {
    if (!routeHasHighSpeedTrain(route)) {
      return { route, reason: null };
    }
  }
  return { route: null, reason: "high_speed" };
}

/**
 * @param {string} type
 * @param {any} result
 * @param {any} status
 * @param {any} bounds
 * @param {any} flags
 * @param {number} currentRequest
 */
function handleRouteResult(type, result, status, bounds, flags, currentRequest) {
  if (currentRequest !== requestId) {
    return;
  }

  let routeResult = result;
  let rejectReason = null;
  if (type === "rail" && status === "OK" && result?.routes?.length) {
    const selection = selectLocalRailRoute(result);
    if (!selection.route) {
      rejectReason = selection.reason;
    } else if (selection.route !== result.routes[0]) {
      routeResult = { ...result, routes: [selection.route] };
    }
  }

  const isOk = status === "OK" && routeResult?.routes?.[0] && !rejectReason;
  if (isOk) {
    const legs = routeResult.routes[0]?.legs || [];
    const { text: durationText, seconds: durationSeconds } =
      getRouteDurationFromLegs(legs);
    if (type === "walk") {
      walkingValue.textContent = durationText;
      flags.walkOk = true;
      flags.walkSeconds = durationSeconds;
      flags.walkText = durationText;
      flags.walkResult = result;
      if (destinationSource !== "walk_multi" && walkingRenderer) {
        walkingRenderer.setDirections(result);
      }
    } else {
      railValue.textContent = durationText;
      flags.railOk = true;
      flags.railSeconds = durationSeconds;
      flags.railText = durationText;
      flags.railResult = routeResult;
      if (destinationSource !== "walk_multi" && railRenderer) {
        railRenderer.setDirections(routeResult);
      }
    }

    if (routeResult.routes[0].bounds) {
      bounds.union(routeResult.routes[0].bounds);
    }
  } else {
    if (type === "walk") {
      walkingValue.textContent = "経路なし";
      if (destinationSource !== "walk_multi" && walkingRenderer) {
        walkingRenderer.set("directions", null);
      }
    } else {
      if (rejectReason === "high_speed") {
        railValue.textContent = "新幹線除外";
        flags.railRejected = "high_speed";
      } else {
        railValue.textContent = "経路なし";
      }
      if (destinationSource !== "walk_multi" && railRenderer) {
        railRenderer.set("directions", null);
      }
    }
  }

  flags.completed += 1;
  if (flags.completed < flags.expected) {
    return;
  }

  if (destinationSource === "walk_multi") {
    if (flags.walkOk) {
      const targetMinutes =
        desiredWalkTargetMinutes ||
        walkRouteTargetMinutes ||
        getMaxMinutes() ||
        DEFAULT_WALK_TARGET_MINUTES;
      const walkMinutes =
        typeof flags.walkSeconds === "number"
          ? Math.round(flags.walkSeconds / 60)
          : null;
      const railMinutes =
        typeof flags.railSeconds === "number"
          ? Math.round(flags.railSeconds / 60)
          : null;
      const tolerance = Math.max(1, Math.round(targetMinutes * 0.008));
      const walkDiff =
        walkMinutes !== null ? Math.abs(walkMinutes - targetMinutes) : null;
      const railDiff =
        railMinutes !== null ? Math.abs(railMinutes - targetMinutes) : null;
      const safeWalkDiff = walkDiff ?? Number.POSITIVE_INFINITY;
      const safeRailDiff = railDiff ?? Number.POSITIVE_INFINITY;

      let selectedMode = null;
      if (walkMinutes !== null && safeWalkDiff <= tolerance) {
        selectedMode = "walk";
      } else if (railMinutes !== null && safeRailDiff <= tolerance) {
        selectedMode = "rail";
      } else if (walkMinutes !== null && railMinutes !== null) {
        if (walkMinutes < targetMinutes - tolerance && flags.railOk) {
          selectedMode = "rail";
        } else {
          selectedMode = safeWalkDiff <= safeRailDiff ? "walk" : "rail";
        }
      } else if (walkMinutes !== null) {
        selectedMode = "walk";
      } else if (railMinutes !== null) {
        selectedMode = "rail";
      }

      const selectedMinutes =
        selectedMode === "rail" ? railMinutes : walkMinutes;
      const selectedText =
        selectedMode === "rail" ? flags.railText : flags.walkText;
      const selectedLabel =
        selectedMode === "rail" ? "散歩ルート（在来線併用）" : "散歩ルート";

      walkRoutePreferredMode = selectedMode || "walk";

      if (selectedMode === "rail") {
        if (railRenderer) {
          railRenderer.setDirections(flags.railResult || null);
        }
        if (walkingRenderer) {
          walkingRenderer.set("directions", null);
        }
      } else {
        if (walkingRenderer) {
          walkingRenderer.setDirections(flags.walkResult || null);
        }
        if (railRenderer) {
          railRenderer.set("directions", null);
        }
      }
      updateRouteLinks();
      updateRouteBreakdown({
        mode: selectedMode || "walk",
        railResult: flags.railResult,
      });

      if (selectedMinutes !== null) {
        const diff = Math.abs(selectedMinutes - targetMinutes);
        if (diff <= tolerance) {
          setRouteStatus(
            `${selectedLabel}: 約${selectedText}（目標${targetMinutes}分）`
          );
          walkRouteRetryCount = 0;
        } else if (walkRouteRetryCount < WALK_ROUTE_MAX_RETRIES) {
          walkRouteRetryCount += 1;
          const adjustment =
            selectedMinutes < targetMinutes ? "longer" : "shorter";
          const requestTargetMinutes = getAdjustedTargetMinutes(
            targetMinutes,
            selectedMinutes
          );
          setRouteStatus(
            `散歩ルートを調整中... (${walkRouteRetryCount}/${WALK_ROUTE_MAX_RETRIES})`
          );
          runWalkRouteSearch({
            query: lastWalkQuery,
            requestTargetMinutes,
            desiredTargetMinutes: targetMinutes,
            adjustment,
            actualMinutes: selectedMinutes,
            auto: true,
          });
          return;
        } else {
          setRouteStatus(
            `${selectedLabel}: 約${selectedText}（目標${targetMinutes}分から${diff}分ずれ）`
          );
          setRecommendHint("時間が合わない場合は再検索してください。");
        }
      } else {
        setRouteStatus("散歩ルートの所要時間を表示中です。");
      }
    } else if (flags.railOk) {
      walkRoutePreferredMode = "rail";
      if (railRenderer) {
        railRenderer.setDirections(flags.railResult || null);
      }
      if (walkingRenderer) {
        walkingRenderer.set("directions", null);
      }
      updateRouteLinks();
      updateRouteBreakdown({ mode: "rail", railResult: flags.railResult });
      setRouteStatus(
        flags.railText
          ? `散歩ルート（在来線併用）: 約${flags.railText}`
          : "散歩ルート（在来線併用）を表示中です。"
      );
    } else {
      walkRoutePreferredMode = null;
      if (walkingRenderer) {
        walkingRenderer.set("directions", null);
      }
      if (railRenderer) {
        railRenderer.set("directions", null);
      }
      updateRouteLinks();
      clearRouteBreakdown();
      setRouteStatus("徒歩経路が見つかりませんでした。");
    }
  } else if (flags.railRejected === "high_speed") {
    setRouteStatus(
      flags.walkOk
        ? "新幹線が含まれるため在来線ルートを除外しました。徒歩のみ表示しています。"
        : "新幹線が含まれるため在来線ルートを除外しました。"
    );
  } else if (flags.walkOk && flags.railOk) {
    setRouteStatus("徒歩と在来線の所要時間を表示中です。");
  } else if (!flags.walkOk && !flags.railOk) {
    setRouteStatus("経路が見つかりませんでした。");
  } else if (!flags.walkOk) {
    setRouteStatus("徒歩経路が見つかりませんでした。");
  } else {
    setRouteStatus("在来線経路が見つかりませんでした。");
  }

  const maxMinutes = getMaxMinutes();
  if (
    destinationSource !== "walk_multi" &&
    maxMinutes &&
    (flags.walkOk || flags.railOk)
  ) {
    const limitSeconds = maxMinutes * 60;
    const walkWithin =
      typeof flags.walkSeconds === "number" &&
      flags.walkSeconds <= limitSeconds;
    const railWithin =
      typeof flags.railSeconds === "number" &&
      flags.railSeconds <= limitSeconds;
    if (!walkWithin && !railWithin) {
      const message = `上限${maxMinutes}分を超えています。別の候補を選んでください。`;
      if (destinationSource === "recommendation") {
        clearDestination(message);
        setRecommendHint("所要時間の上限を超えたため、候補を再検索してください。");
      } else {
        setRouteStatus(message);
      }
    } else if (walkWithin && railWithin && !flags.railRejected) {
      setRouteStatus(`上限${maxMinutes}分以内です。`);
    }
  }

  if (destinationSource !== "walk_multi") {
    if (flags.railOk && !flags.railRejected) {
      updateRouteBreakdown({ mode: "rail", railResult: flags.railResult });
    } else if (flags.walkOk) {
      updateRouteBreakdown({ mode: "walk", railResult: flags.railResult });
    } else {
      clearRouteBreakdown();
    }
  }

  if (
    destinationSource !== "walk_multi" &&
    !bounds.isEmpty() &&
    destinationLatLng
  ) {
    map.fitBounds(bounds, 80);
  }
}

function calculateRoutes() {
  if (!originLatLng || !destinationLatLng || !directionsService) {
    return;
  }

  const includeTransit = true;
  const hasWaypoints =
    Array.isArray(walkingWaypoints) && walkingWaypoints.length > 0;

  requestId += 1;
  const currentRequest = requestId;
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(originLatLng);
  bounds.extend(destinationLatLng);

  const flags = {
    walkOk: false,
    railOk: false,
    completed: 0,
    walkSeconds: null,
    railSeconds: null,
    railRejected: null,
    walkText: null,
    railText: null,
    walkResult: null,
    railResult: null,
    expected: includeTransit ? 2 : 1,
  };

  walkingValue.textContent = "計算中...";
  railValue.textContent = includeTransit ? "計算中..." : "対象外";
  setRouteStatus("経路を計算中...");
  clearRouteBreakdown();
  updateRouteLinks();

  /** @type {any} */
  const walkingRequest = {
    origin: originLatLng,
    destination: destinationLatLng,
    travelMode: google.maps.TravelMode.WALKING,
  };
  if (hasWaypoints) {
    walkingRequest.waypoints = walkingWaypoints;
    walkingRequest.optimizeWaypoints = false;
  }

  directionsService.route(
    walkingRequest,
    (/** @type {any} */ result, /** @type {any} */ status) =>
      handleRouteResult("walk", result, status, bounds, flags, currentRequest)
  );

  if (includeTransit) {
    /** @type {any} */
    const transitRequest = {
      origin: originLatLng,
      destination: destinationLatLng,
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
    if (hasWaypoints && destinationSource !== "walk_multi") {
      transitRequest.waypoints = walkingWaypoints;
      transitRequest.optimizeWaypoints = false;
    }
    directionsService.route(
      transitRequest,
      (/** @type {any} */ result, /** @type {any} */ status) =>
        handleRouteResult("rail", result, status, bounds, flags, currentRequest)
    );
  } else if (railRenderer) {
    railRenderer.set("directions", null);
  }
}

/**
 * @param {string} apiKey
 */
function loadGoogleMaps(apiKey) {
  const existingScript = document.querySelector(
    'script[src^="https://maps.googleapis.com/maps/api/js"]'
  );
  if (existingScript) {
    return;
  }

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    setStatus("エラー", "error");
    setOverlay("地図の読み込みに失敗しました。APIキーを確認してください。", true);
  };
  document.head.appendChild(script);
}

window.initMap = function initMap() {
  map = new google.maps.Map(mapElement, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#f4efe7" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#1f1a17" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#f4efe7" }] },
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#cfe3f4" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#ffffff" }],
      },
    ],
  });

  directionsService = new google.maps.DirectionsService();
  geocoder = new google.maps.Geocoder();
  walkingRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#ef8354",
      strokeOpacity: 0.75,
      strokeWeight: 4,
    },
  });
  railRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#2f6f5b",
      strokeOpacity: 0.85,
      strokeWeight: 5,
    },
  });

  updateRouteLabels();
  updateRouteHint();
  updateRegionControls();
  if (originAreaSelect) {
    originAreaSelect.addEventListener("change", () => {
      if (originAreaSelect.value && originRegionSelect) {
        originRegionSelect.value = "";
      }
      if (originAreaSelect.value !== areaAnchorSelection) {
        areaAnchorSelection = "";
        areaAnchorCache = "";
      }
      updateRegionControls();
    });
  }
  if (originRegionSelect) {
    originRegionSelect.addEventListener("change", () => {
      if (originRegionSelect.value && originAreaSelect) {
        originAreaSelect.value = "";
      }
      if (originAreaSelect?.value !== areaAnchorSelection) {
        areaAnchorSelection = "";
        areaAnchorCache = "";
      }
      updateRegionControls();
    });
  }
  resetButton.addEventListener("click", () => {
    resetRoute();
  });
  if (originRegionButton) {
    originRegionButton.addEventListener("click", handleOriginRegionStart);
  }
  recommendForm.addEventListener("submit", handleRecommendSubmit);
  maxTimeInput.addEventListener("input", updateLimitHint);
  updateLimitHint();

  map.addListener("click", (/** @type {any} */ event) => {
    if (!originLatLng) {
      setOrigin(event.latLng);
      updateRouteLabels();
      updateRouteHint();
      return;
    }

    if (!destinationLatLng) {
      setDestination(event.latLng, "manual");
      updateRouteLabels();
      updateRouteHint();
      calculateRoutes();
      return;
    }

    resetRoute();
    setOrigin(event.latLng);
    updateRouteLabels();
    updateRouteHint();
  });

  setStatus("準備完了", "ready");
  setOverlay("", false);
};

const keyMissing = !MAPS_API_KEY || MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY";

if (keyMissing) {
  setStatus("未設定", "missing");
  setOverlay("APIキーを設定してください。", true);
} else {
  setStatus("読み込み中", "loading");
  setOverlay("地図を読み込み中...", true);
  loadGoogleMaps(MAPS_API_KEY);
}
