/* exported MAPS_API_KEY, DEFAULT_CENTER, DEFAULT_ZOOM, statusCard, keyStatus, overlay, mapElement, originLabel */
/* exported destinationLabel, walkingValue, railValue, routeHint, routeStatus, routeLinks, walkingRouteLink */
/* exported railRouteLink, routeBreakdown, routeBreakdownList, resetButton, recommendForm, recommendQuery */
/* exported maxTimeInput, limitHint, recommendHint, recommendResult, recommendTitle, recommendAddress */
/* exported recommendReason, recommendMapLink, recommendStopsSection, recommendStops, recommendSources */
/* exported recommendButton, recommendButtonLabel, originAreaSelect, originRegionSelect, originRegionButton */
/* exported originRegionHint, DEFAULT_WALK_TARGET_MINUTES, WALK_ROUTE_MAX_RETRIES, DEFAULT_ORIGIN_REGION_HINT */
/* exported REGION_GROUPS, STATION_TYPES, REGION_STATION_QUERIES, REGION_QUERY_EXCEPTIONS, MAX_STATION_QUERIES, map */
/* exported directionsService, walkingRenderer, railRenderer, originMarker, destinationMarker, originLatLng */
/* exported destinationLatLng, destinationName, requestId, geocoder, destinationSource, originRegion */
/* exported walkingWaypoints, walkRouteTargetMinutes, walkRouteRetryCount, lastWalkQuery, desiredWalkTargetMinutes */
/* exported walkRoutePreferredMode, areaAnchorCache, areaAnchorSelection */
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
