/**
 * アプリ全体の共有状態と定数を定義する。
 * @file アプリ全体の共有状態と定数を定義する。
 */
/* exported MAPS_API_KEY, DEFAULT_CENTER, DEFAULT_ZOOM, statusCard, keyStatus, overlay, mapElement, originLabel */
/* exported destinationLabel, walkingValue, railValue, routeHint, routeStatus, routeLinks, walkingRouteLink */
/* exported railRouteLink, routeBreakdown, routeBreakdownList, resetButton, recommendForm, recommendQuery */
/* exported maxTimeInput, limitHint, recommendHint, recommendResult, recommendTitle, recommendAddress */
/* exported recommendReason, recommendMapLink, recommendStopsSection, recommendStops, recommendSources */
/* exported recommendButton, recommendButtonLabel, originAreaSelect, originRegionSelect, originRegionButton */
/* exported walkingModeToggle, railModeToggle, getRouteModeSelection */
/* exported originRegionHint, DEFAULT_WALK_TARGET_MINUTES, WALK_ROUTE_MAX_RETRIES, DEFAULT_ORIGIN_REGION_HINT */
/* exported REGION_GROUPS, STATION_TYPES, REGION_STATION_QUERIES, REGION_QUERY_EXCEPTIONS, MAX_STATION_QUERIES, map */
/* exported directionsService, walkingRenderer, railRenderer, originMarker, destinationMarker, originLatLng */
/* exported destinationLatLng, destinationName, requestId, geocoder, destinationSource, originRegion */
/* exported walkingWaypoints, walkRouteRailStations, walkRouteTargetMinutes, walkRouteRetryCount */
/* exported lastWalkQuery, desiredWalkTargetMinutes, walkRoutePreferredMode, areaAnchorCache */
/* exported areaAnchorSelection */
// Google Maps APIキーを保持する。
const MAPS_API_KEY = /** @type {string} */ ("");
// 地図の初期中心座標を定義する。
const DEFAULT_CENTER = { lat: 35.681236, lng: 139.767125 };
// DEFAULT_ZOOMの定数を定義する。
const DEFAULT_ZOOM = 13;

// DOM要素を取得する。
const statusCard = /** @type {HTMLDivElement} */ (
  document.getElementById("statusCard")
);
// DOM要素を取得する。
const keyStatus = /** @type {HTMLParagraphElement} */ (
  document.getElementById("keyStatus")
);
// DOM要素を取得する。
const overlay = /** @type {HTMLDivElement} */ (
  document.getElementById("mapOverlay")
);
// DOM要素を取得する。
const mapElement = /** @type {HTMLDivElement} */ (
  document.getElementById("map")
);
// DOM要素を取得する。
const originLabel = /** @type {HTMLParagraphElement} */ (
  document.getElementById("originLabel")
);
// DOM要素を取得する。
const destinationLabel = /** @type {HTMLParagraphElement} */ (
  document.getElementById("destinationLabel")
);
// DOM要素を取得する。
const walkingValue = /** @type {HTMLParagraphElement} */ (
  document.getElementById("walkingValue")
);
// DOM要素を取得する。
const railValue = /** @type {HTMLParagraphElement} */ (
  document.getElementById("railValue")
);
// DOM要素を取得する。
const routeHint = /** @type {HTMLParagraphElement} */ (
  document.getElementById("routeHint")
);
// DOM要素を取得する。
const routeStatus = /** @type {HTMLParagraphElement} */ (
  document.getElementById("routeStatus")
);
// DOM要素を取得する。
const walkingModeToggle = /** @type {HTMLInputElement} */ (
  document.getElementById("walkingMode")
);
// DOM要素を取得する。
const railModeToggle = /** @type {HTMLInputElement} */ (
  document.getElementById("railMode")
);
// DOM要素を取得する。
const routeLinks = /** @type {HTMLDivElement} */ (
  document.getElementById("routeLinks")
);
// DOM要素を取得する。
const walkingRouteLink = /** @type {HTMLAnchorElement} */ (
  document.getElementById("walkingRouteLink")
);
// DOM要素を取得する。
const railRouteLink = /** @type {HTMLAnchorElement} */ (
  document.getElementById("railRouteLink")
);
// DOM要素を取得する。
const routeBreakdown = /** @type {HTMLDivElement} */ (
  document.getElementById("routeBreakdown")
);
// DOM要素を取得する。
const routeBreakdownList = /** @type {HTMLOListElement} */ (
  document.getElementById("routeBreakdownList")
);
// DOM要素を取得する。
const resetButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("resetRoute")
);
// DOM要素を取得する。
const recommendForm = /** @type {HTMLFormElement} */ (
  document.getElementById("recommendForm")
);
// DOM要素を取得する。
const recommendQuery = /** @type {HTMLInputElement} */ (
  document.getElementById("recommendQuery")
);
// DOM要素を取得する。
const maxTimeInput = /** @type {HTMLInputElement} */ (
  document.getElementById("maxTimeInput")
);
// DOM要素を取得する。
const limitHint = /** @type {HTMLParagraphElement} */ (
  document.getElementById("limitHint")
);
// DOM要素を取得する。
const recommendHint = /** @type {HTMLParagraphElement} */ (
  document.getElementById("recommendHint")
);
// DOM要素を取得する。
const recommendResult = /** @type {HTMLDivElement} */ (
  document.getElementById("recommendResult")
);
// DOM要素を取得する。
const recommendTitle = /** @type {HTMLParagraphElement} */ (
  document.getElementById("recommendTitle")
);
// DOM要素を取得する。
const recommendAddress = /** @type {HTMLParagraphElement} */ (
  document.getElementById("recommendAddress")
);
// DOM要素を取得する。
const recommendReason = /** @type {HTMLParagraphElement} */ (
  document.getElementById("recommendReason")
);
// DOM要素を取得する。
const recommendMapLink = /** @type {HTMLAnchorElement} */ (
  document.getElementById("recommendMapLink")
);
// DOM要素を取得する。
const recommendStopsSection = /** @type {HTMLDivElement} */ (
  document.getElementById("recommendStopsSection")
);
// DOM要素を取得する。
const recommendStops = /** @type {HTMLOListElement} */ (
  document.getElementById("recommendStops")
);
// DOM要素を取得する。
const recommendSources = /** @type {HTMLUListElement} */ (
  document.getElementById("recommendSources")
);
// DOM要素を取得する。
const recommendButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("recommendButton")
);
// recommendButtonLabelを条件で選ぶ。
const recommendButtonLabel = recommendButton.textContent || "";
// DOM要素を取得する。
const originAreaSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("originAreaSelect")
);
// DOM要素を取得する。
const originRegionSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById("originRegionSelect")
);
// DOM要素を取得する。
const originRegionButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("originRegionButton")
);
// DOM要素を取得する。
const originRegionHint = /** @type {HTMLParagraphElement} */ (
  document.getElementById("originRegionHint")
);

/**
 * ルート検索対象のチェック状態を取得する。
 * @returns {{ walkEnabled: boolean, railEnabled: boolean, hasSelection: boolean }} 選択状態。
 */
function getRouteModeSelection() {
  // walkEnabledを取得する。
  const walkEnabled = walkingModeToggle ? walkingModeToggle.checked : true;
  // railEnabledを取得する。
  const railEnabled = railModeToggle ? railModeToggle.checked : true;
  return {
    walkEnabled,
    railEnabled,
    hasSelection: walkEnabled || railEnabled,
  };
}

// DEFAULT_WALK_TARGET_MINUTESの定数を定義する。
const DEFAULT_WALK_TARGET_MINUTES = 60;
// WALK_ROUTE_MAX_RETRIESの定数を定義する。
const WALK_ROUTE_MAX_RETRIES = 4;
// DEFAULT_ORIGIN_REGION_HINTの定数を定義する。
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
// Setのインスタンスを作成する。
const STATION_TYPES = new Set([
  "train_station",
  "transit_station",
  "subway_station",
  "light_rail_station",
]);
// REGION_STATION_QUERIESの一覧を用意する。
const REGION_STATION_QUERIES = ["駅", "JR駅", "主要駅", "中心駅", "代表駅"];
/** @type {Record<string, string>} */
const REGION_QUERY_EXCEPTIONS = {
  北海道: "札幌",
  沖縄県: "那覇",
};
// MAX_STATION_QUERIESの定数を定義する。
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
// destinationNameの初期値を定義する。
let destinationName = "";
// リクエストの初期値を定義する。
let requestId = 0;
/** @type {any} */
let geocoder = null;
/** @type {string | null} */
let destinationSource = null;
/** @type {string | null} */
let originRegion = null;
/** @type {Array<any> | null} */
let walkingWaypoints = null;
/** @type {any | null} */
let walkRouteRailStations = null;
/** @type {number | null} */
let walkRouteTargetMinutes = null;
// 件数の初期値を定義する。
let walkRouteRetryCount = 0;
// lastWalkQueryの初期値を定義する。
let lastWalkQuery = "";
/** @type {number | null} */
let desiredWalkTargetMinutes = null;
/** @type {string | null} */
let walkRoutePreferredMode = null;
// キャッシュの初期値を定義する。
let areaAnchorCache = "";
// areaAnchorSelectionの初期値を定義する。
let areaAnchorSelection = "";
