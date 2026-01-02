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
 * 住所コンポーネントから地域名を抽出する。
 * @param {any} components 住所コンポーネント配列。
 * @returns {string | null} 地域名またはnull。
 */
function extractRegionFromComponents(components) {
  let region = null;
  if (Array.isArray(components)) {
    const findPart = (/** @type {string} */ type) =>
      components.find((/** @type {any} */ component) =>
        component.types?.includes(type)
      )?.long_name;
    const prefecture = findPart("administrative_area_level_1");
    const locality = findPart("locality") || findPart("sublocality_level_1");
    const sublocality = findPart("sublocality_level_2");
    const parts = [prefecture, locality, sublocality].filter(Boolean);
    region = parts.length ? parts.join("") : null;
  }
  return region;
}

/**
 * 地域フィルタを配列に正規化する。
 * @param {any} region 地域指定。
 * @returns {string[]} フィルタ配列。
 */
function normalizeRegionFilter(region) {
  let filters = [];
  if (region) {
    if (Array.isArray(region)) {
      filters = region.filter(Boolean);
    } else if (typeof region === "string") {
      filters = region
        .split(/[、,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return filters;
}

/**
 * 地域名がフィルタに一致するか判定する。
 * @param {string} regionName 地域名。
 * @param {any} context 判定用コンテキスト。
 * @returns {boolean} 一致判定。
 */
function isRegionMatch(regionName, context) {
  let isMatch = true;
  if (regionName && context) {
    const filters = normalizeRegionFilter(
      Array.isArray(context.prefectures) && context.prefectures.length > 0
        ? context.prefectures
        : context.label
    );
    if (filters.length) {
      isMatch = filters.some((filter) => regionName.includes(filter));
    }
  }
  return isMatch;
}

/**
 * 出発地が地域条件に合うか判定する。
 * @param {any} latLng 出発地座標。
 * @param {any} context 判定用コンテキスト。
 * @returns {Promise<boolean>} 一致判定のPromise。
 */
async function resolveIsOriginInRegion(latLng, context) {
  let isMatch = true;
  if (latLng && context) {
    const regionName = await resolveOriginRegion(latLng);
    if (regionName) {
      isMatch = isRegionMatch(regionName, context);
    } else if (originRegion) {
      isMatch = isRegionMatch(originRegion, context);
    } else {
      isMatch = false;
    }
  }
  return isMatch;
}

/**
 * 配列からランダムに1件選ぶ。
 * @param {any[]} list 候補配列。
 * @returns {string} 選択された文字列。
 */
function pickRandomItem(list) {
  let picked = "";
  if (Array.isArray(list) && list.length > 0) {
    const index = Math.floor(Math.random() * list.length);
    picked = list[index];
  }
  return picked;
}

/**
 * 選択エリアのアンカー文字列を決定する。
 * @param {string} areaValue エリア名。
 * @param {boolean} refreshAnchor アンカー再生成フラグ。
 * @returns {string} アンカー文字列。
 */
function getAreaAnchor(areaValue, refreshAnchor) {
  let anchor = "";
  if (areaValue && REGION_GROUPS[areaValue]) {
    const group = REGION_GROUPS[areaValue];
    if (areaValue !== areaAnchorSelection || refreshAnchor) {
      if (areaValue === "関東地方") {
        areaAnchorCache = pickRandomItem(group.prefectures) || group.anchor;
      } else {
        areaAnchorCache = group.anchor;
      }
      areaAnchorSelection = areaValue;
    }
    anchor = areaAnchorCache;
  }
  return anchor;
}

/**
 * 選択UIから地域コンテキストを取得する。
 * @param {{ refreshAnchor?: boolean }} [options] 取得オプション。
 * @returns {any} 地域コンテキスト。
 */
function getSelectedRegionContext(options = {}) {
  const refreshAnchor = Boolean(options.refreshAnchor);
  const areaValue = originAreaSelect?.value?.trim();
  let context = null;
  if (areaValue && REGION_GROUPS[areaValue]) {
    const group = REGION_GROUPS[areaValue];
    context = {
      label: areaValue,
      prefectures: group.prefectures,
      anchor: getAreaAnchor(areaValue, refreshAnchor),
    };
  } else {
    const prefValue = originRegionSelect?.value?.trim();
    if (prefValue) {
      context = {
        label: prefValue,
        prefectures: [prefValue],
        anchor: prefValue,
      };
    }
  }
  return context;
}

/**
 * プロンプト用に地域ラベルを整形する。
 * @param {any} context 地域コンテキスト。
 * @returns {string} 地域ラベル。
 */
function formatRegionForPrompt(context) {
  return context ? context.label : "";
}

/**
 * 逆ジオコードで出発地の地域名を取得する。
 * @param {any} latLng 出発地座標。
 * @returns {Promise<string | null>} 地域名またはnullのPromise。
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

/**
 * 所要時間の上限を取得する。
 * @returns {number | null} 上限分数またはnull。
 */
function getMaxMinutes() {
  const value = Number.parseInt(maxTimeInput.value, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * 目標所要時間を取得する。
 * @returns {number} 目標分数。
 */
function getTargetMinutes() {
  return getMaxMinutes() || DEFAULT_WALK_TARGET_MINUTES;
}

/**
 * 所要時間上限のヒントを更新する。
 */
function updateLimitHint() {
  const maxMinutes = getMaxMinutes();
  limitHint.textContent = maxMinutes
    ? `所要時間の上限は${maxMinutes}分です。`
    : `未入力なら制限なし（空欄検索は${DEFAULT_WALK_TARGET_MINUTES}分目安）`;
}

/**
 * おすすめヒントを更新する。
 * @param {string} message ヒント文。
 */
function setRecommendHint(message) {
  recommendHint.textContent = message;
}

/**
 * おすすめ検索のローディング状態を切り替える。
 * @param {boolean} loading ローディングフラグ。
 */
function setRecommendLoading(loading) {
  recommendButton.disabled = loading;
  recommendQuery.disabled = loading;
  recommendButton.textContent = loading
    ? "検索中..."
    : recommendButtonLabel;
}

/**
 * おすすめ表示を初期化する。
 */
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
 * おすすめ地点の立ち寄りを描画する。
 * @param {any} stops 立ち寄りリスト。
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
 * おすすめの参照元を描画する。
 * @param {any} sources 参照元リスト。
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
 * Google Maps検索リンクを作成する。
 * @param {string} query 検索クエリ。
 * @returns {string} 検索URL。
 */
function buildMapsLink(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

/**
 * 座標をURL用に整形する。
 * @param {any} latLng 座標オブジェクト。
 * @returns {string} URL用文字列。
 */
function formatLatLngForUrl(latLng) {
  let value = "";
  if (latLng) {
    if (typeof latLng === "string") {
      value = latLng;
    } else if (typeof latLng.toUrlValue === "function") {
      value = latLng.toUrlValue(6);
    } else {
      value = `${latLng.lat().toFixed(6)},${latLng.lng().toFixed(6)}`;
    }
  }
  return value;
}

/**
 * 秒数を時間表記に変換する。
 * @param {number} totalSeconds 合計秒数。
 * @returns {string} 表示用文字列。
 */
function formatDurationText(totalSeconds) {
  let text = "不明";
  if (Number.isFinite(totalSeconds)) {
    const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
    if (totalMinutes < 60) {
      text = `${totalMinutes}分`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      text = minutes === 0 ? `${hours}時間` : `${hours}時間${minutes}分`;
    }
  }
  return text;
}

/**
 * ルート区間から所要時間を集計する。
 * @param {any[]} legs ルート区間配列。
 * @returns {{ text: string, seconds: number | null }} 表示文字列と秒数。
 */
function getRouteDurationFromLegs(legs) {
  /** @type {{ text: string, seconds: number | null }} */
  let summary = { text: "不明", seconds: null };
  if (Array.isArray(legs) && legs.length > 0) {
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
      summary = { text: formatDurationText(totalSeconds), seconds: totalSeconds };
    } else {
      const fallbackText = legs[0]?.duration?.text;
      summary = { text: fallbackText || "不明", seconds: null };
    }
  }
  return summary;
}

/**
 * 座標をリテラル形式に正規化する。
 * @param {any} latLng 座標オブジェクト。
 * @returns {{ lat: number, lng: number } | null} 座標リテラルまたはnull。
 */
function getLatLngLiteral(latLng) {
  let literal = null;
  if (latLng) {
    if (typeof latLng.lat === "function") {
      literal = { lat: latLng.lat(), lng: latLng.lng() };
    } else if (
      typeof latLng.lat === "number" &&
      typeof latLng.lng === "number"
    ) {
      literal = { lat: latLng.lat, lng: latLng.lng };
    }
  }
  return literal;
}

/**
 * 2点間の距離をメートルで計算する。
 * @param {any} a 座標A。
 * @param {any} b 座標B。
 * @returns {number | null} 距離メートルまたはnull。
 */
function computeDistanceMeters(a, b) {
  let distance = null;
  if (a && b) {
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
    distance = 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  return distance;
}

/**
 * Google Mapsの経路URLを生成する。
 * @param {{ origin: any, destination: any, travelMode?: any, waypoints?: any, transitMode?: any }} options 生成オプション。
 * @returns {string} 経路URL。
 */
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
 * ポイントラベルを正規化する。
 * @param {any} label ラベル値。
 * @returns {string} 正規化ラベル。
 */
function normalizePointLabel(label) {
  let normalized = "";
  if (typeof label === "string") {
    const trimmed = label.trim();
    if (trimmed && !GENERIC_POINT_LABELS.has(trimmed)) {
      normalized = trimmed;
    }
  }
  return normalized;
}

/**
 * 区間検索用のクエリを生成する。
 * @param {{ fromLabel?: any, toLabel?: any, from?: any, to?: any }} options 生成オプション。
 * @returns {string} 検索クエリ。
 */
function buildSegmentSearchQuery(
  /** @type {{ fromLabel?: any, toLabel?: any, from?: any, to?: any }} */
  { fromLabel, toLabel, from, to }
) {
  const labels = [normalizePointLabel(fromLabel), normalizePointLabel(toLabel)].filter(
    Boolean
  );
  let query = "";
  if (labels.length) {
    query = labels.join(" ");
  } else {
    const fromValue = formatLatLngForUrl(from);
    const toValue = formatLatLngForUrl(to);
    query = [fromValue, toValue].filter(Boolean).join(" ");
  }
  return query;
}

/**
 * 出発地の表示ラベルを取得する。
 * @returns {string} 表示ラベル。
 */
function getOriginDisplayLabel() {
  return originRegion || "出発地";
}

/**
 * 目的地の表示ラベルを取得する。
 * @returns {string} 表示ラベル。
 */
function getDestinationDisplayLabel() {
  let label = destinationLatLng ? "目的地" : "";
  if (destinationName) {
    label = destinationName;
  }
  return label;
}

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

/**
 * ルート内訳表示をクリアする。
 */
function clearRouteBreakdown() {
  if (!routeBreakdown || !routeBreakdownList) {
    return;
  }
  routeBreakdownList.textContent = "";
  routeBreakdown.hidden = true;
}

/**
 * ルート内訳の区間リストを描画する。
 * @param {any} segments 区間リスト。
 */
function renderRouteBreakdown(segments) {
  if (routeBreakdown && routeBreakdownList) {
    routeBreakdownList.textContent = "";
    if (Array.isArray(segments) && segments.length > 0) {
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
    } else {
      routeBreakdown.hidden = true;
    }
  }
}

/**
 * 在来線ルートの内訳を組み立てる。
 * @param {any} options 生成オプション。
 * @returns {any[]} 区間配列。
 */
function buildRailBreakdownSegments(
  /** @type {any} */
  {
    origin,
    destination,
    originLabel: originLabelText,
    destinationLabel: destinationLabelText,
    railResult,
  }
) {
  let segments = [];
  if (origin && destination) {
    const transitStops = extractTransitStops(railResult);
    if (transitStops) {
      const departureLabel = transitStops.departure?.name || "出発駅";
      const arrivalLabel = transitStops.arrival?.name || "到着駅";
      const firstWalk = buildWalkSegment({
        origin,
        destination: transitStops.departure.location,
        fromLabel: originLabelText,
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
        destination,
        fromLabel: arrivalLabel,
        toLabel: destinationLabelText,
      });
      const railSegments = [firstWalk, railSegment, lastWalk].filter(Boolean);
      if (railSegments.length) {
        segments = railSegments;
      }
    }
  }
  return segments;
}

/**
 * 徒歩ルートの内訳を組み立てる。
 * @param {any} options 生成オプション。
 * @returns {any[]} 区間配列。
 */
function buildWalkBreakdownSegments(
  /** @type {any} */
  {
    origin,
    destination,
    originLabel: originLabelText,
    destinationLabel: destinationLabelText,
    mode,
    waypointPoints,
  }
) {
  /** @type {any[]} */
  let segments = [];
  if (origin && destination) {
    const waypoints =
      mode === "walk" && waypointPoints.length ? waypointPoints : null;
    const walkSegment = buildWalkSegment({
      origin,
      destination,
      fromLabel: originLabelText,
      toLabel: destinationLabelText,
      waypoints,
    });
    if (walkSegment) {
      segments = [walkSegment];
    }
  }
  return segments;
}

/**
 * ルート内訳の区間配列を組み立てる。
 * @param {any} options 生成オプション。
 * @returns {any[]} 区間配列。
 */
function buildRouteBreakdownSegments(
  /** @type {{ mode?: any, railResult?: any }} */ { mode, railResult }
) {
  let segments = [];
  if (originLatLng && destinationLatLng) {
    const originDisplayLabel = getOriginDisplayLabel();
    const destinationDisplayLabel = getDestinationDisplayLabel();
    const waypointPoints = Array.isArray(walkingWaypoints)
      ? walkingWaypoints.map((waypoint) => waypoint.location).filter(Boolean)
      : [];

    if (mode === "rail") {
      segments = buildRailBreakdownSegments({
        origin: originLatLng,
        destination: destinationLatLng,
        originLabel: originDisplayLabel,
        destinationLabel: destinationDisplayLabel,
        railResult,
      });
    }

    if (!segments.length) {
      segments = buildWalkBreakdownSegments({
        origin: originLatLng,
        destination: destinationLatLng,
        originLabel: originDisplayLabel,
        destinationLabel: destinationDisplayLabel,
        mode,
        waypointPoints,
      });
    }
  }
  return segments;
}

/**
 * ルート内訳表示を更新する。
 * @param {{ mode?: any, railResult?: any }} options 更新オプション。
 */
function updateRouteBreakdown(
  /** @type {{ mode?: any, railResult?: any }} */ { mode, railResult }
) {
  const segments = buildRouteBreakdownSegments({ mode, railResult });
  if (!segments.length) {
    clearRouteBreakdown();
  } else {
    renderRouteBreakdown(segments);
  }
}

/**
 * 結果が駅に該当するか判定する。
 * @param {any} result 検索結果。
 * @returns {boolean} 駅判定。
 */
function isStationResult(result) {
  const types = result?.types;
  let isStation = false;
  if (Array.isArray(types)) {
    isStation = types.some((type) => STATION_TYPES.has(type));
  }
  return isStation;
}

/**
 * 結果が地域フィルタに一致するか判定する。
 * @param {any} result 検索結果。
 * @param {any} region 地域フィルタ。
 * @returns {boolean} 一致判定。
 */
function isResultInRegion(result, region) {
  const regionFilters = normalizeRegionFilter(region);
  let isMatch = true;
  if (regionFilters.length) {
    const regionName = extractRegionFromComponents(
      result?.address_components || []
    );
    if (
      regionName &&
      regionFilters.some((filter) => regionName.includes(filter))
    ) {
      isMatch = true;
    } else {
      const formatted = result?.formatted_address || "";
      isMatch = regionFilters.some((filter) => formatted.includes(filter));
    }
  }
  return isMatch;
}

/**
 * 結果から駅ラベルを抽出する。
 * @param {any} result 検索結果。
 * @returns {string} 駅ラベル。
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
 * 地域名の接尾辞を除去する。
 * @param {string} region 地域名。
 * @returns {string} 整形済み地域名。
 */
function stripRegionSuffix(region) {
  let stripped = "";
  if (region) {
    const value = Array.isArray(region) ? region.find(Boolean) : region;
    if (typeof value === "string" && value) {
      stripped = value === "北海道" ? value : value.replace(/[都府県]$/, "");
    }
  }
  return stripped;
}

/**
 * 地域指定からラベル文字列を取得する。
 * @param {string} region 地域指定。
 * @returns {string} 地域ラベル。
 */
function getRegionLabel(region) {
  let label = "";
  if (region) {
    if (Array.isArray(region)) {
      label = region.find(Boolean) || "";
    } else if (typeof region === "string") {
      label = region;
    }
  }
  return label;
}

/**
 * 地域に基づく駅検索クエリを生成する。
 * @param {string} region 地域名。
 * @returns {string[]} 検索クエリ配列。
 */
function buildRegionStationQueries(region) {
  const trimmed = region.trim();
  /** @type {string[]} */
  let queries = [];
  if (trimmed) {
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
    const expanded = [];
    variants.forEach((variant) => {
      REGION_STATION_QUERIES.forEach((suffix) => {
        expanded.push(`${variant} ${suffix}`);
        expanded.push(`${variant}${suffix}`);
      });
    });
    queries = [...new Set(expanded)];
  }
  return queries;
}

/**
 * 結果に駅キーワードが含まれるか判定する。
 * @param {any} result 検索結果。
 * @returns {boolean} 駅キーワード判定。
 */
function resultHasStationKeyword(result) {
  const label = extractStationLabel(result);
  let hasKeyword = false;
  if (label && label.includes("駅")) {
    hasKeyword = true;
  } else if (result?.formatted_address?.includes("駅")) {
    hasKeyword = true;
  } else {
    const components = result?.address_components || [];
    hasKeyword = components.some(
      (/** @type {any} */ component) => component.long_name?.includes("駅")
    );
  }
  return hasKeyword;
}

/**
 * 住所コンポーネントから地名候補を抽出する。
 * @param {any} components 住所コンポーネント配列。
 * @returns {string[]} 地名候補配列。
 */
function extractLocalityCandidates(components) {
  /** @type {string[]} */
  let names = [];
  if (Array.isArray(components)) {
    const types = [
      "locality",
      "administrative_area_level_2",
      "sublocality_level_1",
      "sublocality_level_2",
    ];
    /** @type {string[]} */
    const collected = [];
    types.forEach((type) => {
      const name = components.find((/** @type {any} */ component) =>
        component.types?.includes(type)
      )?.long_name;
      if (name) {
        collected.push(name);
      }
    });
    names = [...new Set(collected)];
  }
  return names;
}

/**
 * 逆ジオコードで地名候補を取得する。
 * @param {any} latLng 座標。
 * @returns {Promise<string[]>} 地名候補配列のPromise。
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
 * 出発地周辺の駅検索クエリを生成する。
 * @returns {string[]} 検索クエリ配列。
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
 * 住所文字列をジオコードする。
 * @param {string} address 住所文字列。
 * @returns {Promise<any[]>} ジオコード結果のPromise。
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
 * 検索結果を駅候補に絞り込む。
 * @param {any} results 検索結果配列。
 * @param {any} region 地域フィルタ。
 * @returns {any[]} 駅候補配列。
 */
function filterStationResults(results, region) {
  const list = Array.isArray(results) ? results : [];
  let filtered = [];
  if (list.length) {
    const hasRegionFilter = normalizeRegionFilter(region).length > 0;
    const stationResults = list.filter(isStationResult);
    const regionStations = stationResults.filter((result) =>
      isResultInRegion(result, region)
    );
    if (regionStations.length) {
      filtered = regionStations;
    } else if (!hasRegionFilter && stationResults.length) {
      filtered = stationResults;
    } else {
      const keywordResults = list.filter(resultHasStationKeyword);
      const regionKeywords = keywordResults.filter((result) =>
        isResultInRegion(result, region)
      );
      if (regionKeywords.length) {
        filtered = regionKeywords;
      } else {
        filtered = hasRegionFilter ? [] : keywordResults;
      }
    }
  }
  return filtered;
}

/**
 * 地域条件に合う駅候補を選ぶ。
 * @param {any} results 検索結果配列。
 * @param {any} region 地域フィルタ。
 * @returns {any} 選択された駅候補。
 */
function selectStationResult(results, region) {
  const filtered = filterStationResults(results, region);
  return filtered[0] || null;
}

/**
 * 地域内の駅候補を探す。
 * @param {string} region 地域名。
 * @returns {Promise<any>} 駅候補のPromise。
 */
async function findStationInRegion(region) {
  let station = null;
  if (geocoder && region) {
    const queries = buildRegionStationQueries(region);
    for (const query of queries) {
      const results = await geocodeByAddress(query);
      const selected = selectStationResult(results, region);
      if (selected?.geometry?.location) {
        station = {
          location: selected.geometry.location,
          name: extractStationLabel(selected),
          address: selected.formatted_address || "",
        };
        break;
      }
    }
  }
  return station;
}

/**
 * 結果から駅名を取得する。
 * @param {any} result 検索結果。
 * @returns {string} 駅名。
 */
function getStationNameFromResult(result) {
  let name = "";
  if (result) {
    name =
      result.name ||
      extractStationLabel(result) ||
      result.formatted_address ||
      "";
  }
  return name;
}

/**
 * 地域名をアンカー座標に解決する。
 * @param {string} region 地域名。
 * @returns {Promise<any>} 座標のPromise。
 */
async function resolveRegionAnchor(region) {
  let location = null;
  if (region) {
    try {
      location = await geocodeAddress(region);
    } catch (error) {
      location = null;
    }
  }
  return location;
}

/**
 * 指定地点から最寄り駅候補を探す。
 * @param {{ startLocation?: any, stopName?: any, region?: any }} options 検索オプション。
 * @returns {Promise<any | null>} 駅候補またはnullのPromise。
 */
async function findNearestStationToLocation(
  /** @type {{ startLocation?: any, stopName?: any, region?: any }} */
  { startLocation, stopName, region }
) {
  let station = null;
  if (geocoder && startLocation) {
    const localities = await resolveLocalityCandidates(startLocation);
    const queries = buildStartStationQueries({
      region,
      stopName,
      localities,
    }).slice(0, MAX_STATION_QUERIES);
    const startLiteral = getLatLngLiteral(startLocation);
    if (queries.length && startLiteral) {
      /** @type {Array<{ result: any, distance: number }>} */
      const candidates = [];
      for (const query of queries) {
        const results = await geocodeByAddress(query);
        const filtered = filterStationResults(results, region);
        filtered.forEach((result) => {
          const locationLiteral = getLatLngLiteral(result?.geometry?.location);
          const distance =
            locationLiteral &&
            computeDistanceMeters(startLiteral, locationLiteral);
          if (locationLiteral && distance !== null) {
            candidates.push({ result, distance });
          }
        });
      }

      if (candidates.length) {
        candidates.sort((a, b) => a.distance - b.distance);
        const best = candidates[0];
        if (best) {
          station = {
            location: best.result?.geometry?.location || null,
            name: getStationNameFromResult(best.result),
            address: best.result?.formatted_address || "",
          };
        }
      }
    }
  }
  return station;
}

/**
 * 地域指定の入力条件を確認する。
 * @param {any} options 判定オプション。
 * @returns {boolean} 判定結果。
 */
function canUseOriginRegionContext(
  /** @type {{ context: any, source?: string }} */ { context, source }
) {
  let canProceed = true;
  if (!originRegionHint) {
    if (source === "recommend") {
      setRecommendHint("先に出発地を選択してください。");
    }
    canProceed = false;
  } else if (!context?.label) {
    setOriginRegionHint("地方または都道府県を選択してください。");
    if (source === "recommend") {
      setRecommendHint(
        "地方または都道府県を選択するか、地図をクリックして出発地を指定してください。"
      );
    }
    canProceed = false;
  }
  return canProceed;
}

/**
 * 地域コンテキストから駅候補を探す。
 * @param {any} context 地域コンテキスト。
 * @returns {Promise<any>} 駅候補のPromise。
 */
async function resolveStationFromContext(context) {
  let station = null;
  if (context?.label) {
    const regionLabel = context.label;
    const regionFilter = context.prefectures || context.label;
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
  }
  return station;
}

/**
 * 駅候補を出発地に反映する。
 * @param {any} options 反映オプション。
 * @returns {boolean} 反映可否。
 */
function applyOriginFromStation(
  /** @type {{ station: any, context: any, source?: string }} */
  { station, context, source }
) {
  let isReady = false;
  const regionLabel = context?.label || "";
  if (!station?.location) {
    setOriginRegionHint("地域内の駅が見つかりませんでした。");
    if (source === "recommend") {
      setRecommendHint("地域内の駅が見つからないため出発地を指定できません。");
    }
  } else {
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
    isReady = true;
  }
  return isReady;
}

/**
 * 地域指定から出発地を設定する。
 * @param {{ source?: string }} [options] 設定オプション。
 * @returns {Promise<boolean>} 設定可否のPromise。
 */
async function ensureOriginFromRegion(
  /** @type {{ source?: string }} */ { source } = {}
) {
  let isReady = Boolean(originLatLng);
  if (!isReady) {
    const context = getSelectedRegionContext({ refreshAnchor: true });
    const contextOptions =
      typeof source === "string" ? { context, source } : { context };
    const canProceed = canUseOriginRegionContext(contextOptions);
    if (canProceed) {
      const regionLabel = context.label;
      setOriginRegionHint(`${regionLabel}の駅を探しています...`);
      const station = await resolveStationFromContext(context);
      const stationOptions =
        typeof source === "string"
          ? { station, context, source }
          : { station, context };
      isReady = applyOriginFromStation(stationOptions);
    }
  }
  return isReady;
}

/**
 * 地域指定による出発地設定を実行する。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function handleOriginRegionStart() {
  if (originLatLng) {
    setOriginRegionHint(
      "出発地が選択済みです。リセットすると地域指定が使えます。"
    );
  } else {
    await ensureOriginFromRegion({ source: "manual" });
  }
}

/**
 * 目標時間を実測に合わせて補正する。
 * @param {number | null} targetMinutes 目標分数。
 * @param {number | null} durationMinutes 実測分数。
 * @returns {number | null} 補正後分数。
 */
function getAdjustedTargetMinutes(targetMinutes, durationMinutes) {
  let adjusted = targetMinutes;
  if (targetMinutes && durationMinutes) {
    if (durationMinutes < targetMinutes) {
      const diff = targetMinutes - durationMinutes;
      adjusted = Math.min(
        Math.round(targetMinutes * 1.5),
        targetMinutes + Math.max(20, Math.round(diff * 0.8))
      );
    } else {
      const diff = durationMinutes - targetMinutes;
      adjusted = Math.max(
        20,
        targetMinutes - Math.max(15, Math.round(diff * 0.6))
      );
    }
  }
  return adjusted;
}

/**
 * 散歩ルートの地域情報を整理する。
 * @param {boolean} auto 自動再検索フラグ。
 * @returns {any} 地域情報。
 */
function buildWalkRouteRegionInfo(auto) {
  const regionContext = getSelectedRegionContext({ refreshAnchor: !auto });
  const regionLabel = regionContext?.label || originRegion || "";
  const regionFilter = Array.isArray(regionContext?.prefectures)
    ? regionContext.prefectures
    : regionLabel
      ? [regionLabel]
      : [];
  const regionForPrompt = formatRegionForPrompt(regionContext) || regionLabel;
  const regionAnchor = regionContext?.anchor || regionLabel;
  return {
    regionContext,
    regionLabel,
    regionFilter,
    regionForPrompt,
    regionAnchor,
  };
}

/**
 * 散歩ルートの出発地状態を判定する。
 * @param {any} regionContext 地域コンテキスト。
 * @returns {Promise<any>} 判定結果のPromise。
 */
async function resolveWalkRouteOriginStatus(regionContext) {
  let originMismatch = false;
  if (originLatLng && regionContext) {
    originMismatch = !(await resolveIsOriginInRegion(originLatLng, regionContext));
  }
  const originMissing = !originLatLng || originMismatch;
  return { originMissing, originMismatch };
}

/**
 * 散歩ルートの出発地補正を取得する。
 * @param {any} options 補正オプション。
 * @returns {Promise<any>} 補正結果のPromise。
 */
async function resolveWalkRouteOriginOverride(
  /**
   * @type {{
   *   originMissing: boolean,
   *   originMismatch: boolean,
   *   regionForPrompt: string,
   *   regionAnchor: string,
   *   regionLabel: string
   * }}
   */
  { originMissing, originMismatch, regionForPrompt, regionAnchor, regionLabel }
) {
  let originOverride = null;
  let originRegionOverride = null;
  if (originMissing) {
    if (originMismatch) {
      setOriginRegionHint("選択した地域に合わせて出発地を再設定しています...");
    }
    originRegionOverride = regionForPrompt;
    if (!originRegionOverride) {
      throw new Error("地方または都道府県を選択してください。");
    }
    originOverride = await resolveRegionAnchor(regionAnchor || originRegionOverride);
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
  return { originOverride, originRegionOverride };
}

/**
 * 散歩ルートのおすすめを取得する。
 * @param {any} options 取得オプション。
 * @returns {Promise<any>} おすすめデータのPromise。
 */
async function fetchWalkRouteRecommendation(
  /**
   * @type {{
   *   query?: any,
   *   requestTargetMinutes?: any,
   *   adjustment?: any,
   *   actualMinutes?: any,
   *   originOverride?: any,
   *   originRegionOverride?: any,
   *   regionContext?: any
   * }}
   */
  {
    query,
    requestTargetMinutes,
    adjustment,
    actualMinutes,
    originOverride,
    originRegionOverride,
    regionContext,
  }
) {
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
  return data.place;
}

/**
 * 散歩ルートの地点情報を取得する。
 * @param {any} place おすすめデータ。
 * @returns {Promise<any>} 地点情報のPromise。
 */
async function resolveWalkRouteLocations(place) {
  const locations = await geocodeStops(place?.stops);
  if (locations.length < 2) {
    throw new Error("散歩ルートの地点を見つけられませんでした。");
  }
  const startLocation = locations[0];
  const startStop = Array.isArray(place?.stops) ? place.stops[0] : null;
  const startStopName =
    typeof startStop === "string"
      ? startStop
      : startStop?.name || startStop?.title || "";
  return { locations, startLocation, startStopName };
}

/**
 * 散歩ルートの出発地を調整する。
 * @param {any} options 調整オプション。
 * @returns {Promise<boolean>} 先頭地点を使ったかどうかのPromise。
 */
async function applyWalkRouteOriginFromStops(
  /**
   * @type {{
   *   originMissing: boolean,
   *   startLocation: any,
   *   startStopName: string,
   *   regionFilter: any[],
   *   regionLabel: string,
   *   originRegionOverride: string | null
   * }}
   */
  {
    originMissing,
    startLocation,
    startStopName,
    regionFilter,
    regionLabel,
    originRegionOverride,
  }
) {
  let originUsesStartLocation = false;
  if (originMissing) {
    const regionValue = regionFilter.length ? regionFilter : originRegionOverride;
    const station = await findNearestStationToLocation({
      startLocation,
      stopName: startStopName,
      region: regionValue,
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
      setOriginRegionHint("最寄り駅が見つからないため最初の地点から開始します。");
    }
  }
  return originUsesStartLocation;
}

/**
 * 散歩ルートの目的地と経由地を更新する。
 * @param {any} options 更新オプション。
 */
function applyWalkRouteDestination(
  /**
   * @type {{
   *   locations: any[],
   *   originUsesStartLocation: boolean,
   *   place: any,
   *   desiredTargetMinutes: any
   * }}
   */
  { locations, originUsesStartLocation, place, desiredTargetMinutes }
) {
  const waypointStartIndex = originUsesStartLocation ? 1 : 0;
  walkingWaypoints = locations.slice(waypointStartIndex, -1).map((location) => ({
    location,
    stopover: true,
  }));
  const endStop = Array.isArray(place?.stops)
    ? place.stops[place.stops.length - 1]
    : null;
  const endStopLabel =
    getStopLabel(endStop) || place?.address || place?.area || "";
  walkRouteTargetMinutes = desiredTargetMinutes;
  desiredWalkTargetMinutes = desiredTargetMinutes;
  setDestination(locations[locations.length - 1], "walk_multi", {
    label: endStopLabel,
  });
  updateRouteLabels();
  updateRouteHint();
  updateRouteLinks();
  calculateRoutes();
}

/**
 * 散歩ルート検索を実行する。
 * @param {{
 *   query?: any,
 *   requestTargetMinutes?: any,
 *   desiredTargetMinutes?: any,
 *   adjustment?: any,
 *   actualMinutes?: any,
 *   auto?: boolean
 * }} options 検索オプション。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function runWalkRouteSearch(
  /**
   * @type {{
   *   query?: any,
   *   requestTargetMinutes?: any,
   *   desiredTargetMinutes?: any,
   *   adjustment?: any,
   *   actualMinutes?: any,
   *   auto?: boolean
   * }}
   */
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
    const regionInfo = buildWalkRouteRegionInfo(Boolean(auto));
    const originStatus = await resolveWalkRouteOriginStatus(
      regionInfo.regionContext
    );
    const originOverrides = await resolveWalkRouteOriginOverride({
      originMissing: originStatus.originMissing,
      originMismatch: originStatus.originMismatch,
      regionForPrompt: regionInfo.regionForPrompt,
      regionAnchor: regionInfo.regionAnchor,
      regionLabel: regionInfo.regionLabel,
    });
    const place = await fetchWalkRouteRecommendation({
      query,
      requestTargetMinutes,
      adjustment,
      actualMinutes,
      originOverride: originOverrides.originOverride,
      originRegionOverride: originOverrides.originRegionOverride,
      regionContext: regionInfo.regionContext,
    });
    showRecommendResult(place);

    const locationInfo = await resolveWalkRouteLocations(place);
    const originUsesStartLocation = await applyWalkRouteOriginFromStops({
      originMissing: originStatus.originMissing,
      startLocation: locationInfo.startLocation,
      startStopName: locationInfo.startStopName,
      regionFilter: regionInfo.regionFilter,
      regionLabel: regionInfo.regionLabel,
      originRegionOverride: originOverrides.originRegionOverride,
    });
    applyWalkRouteDestination({
      locations: locationInfo.locations,
      originUsesStartLocation,
      place,
      desiredTargetMinutes,
    });
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
 * おすすめ結果をUIに表示する。
 * @param {any} place おすすめデータ。
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

/**
 * おすすめ取得用の出発地情報を取得する。
 * @param {any} originOverride 出発地上書き。
 * @returns {any} 出発地情報。
 */
function resolveRecommendationOrigin(originOverride) {
  const originSource = originOverride || originLatLng;
  const originLiteral = getLatLngLiteral(originSource);
  if (!originLiteral) {
    throw new Error("出発地の座標が不正です。");
  }
  return { originSource, originLiteral };
}

/**
 * おすすめ取得の地域名を取得する。
 * @param {any} originSource 出発地座標。
 * @param {any} originRegionOverride 上書き地域。
 * @returns {Promise<string>} 地域名のPromise。
 */
async function resolveRecommendationRegion(originSource, originRegionOverride) {
  let region =
    typeof originRegionOverride === "string" ? originRegionOverride.trim() : "";
  if (!region) {
    region = originRegion || (await resolveOriginRegion(originSource)) || "";
  }
  originRegion = region;
  return region;
}

/**
 * おすすめ取得の地域選択情報を取得する。
 * @param {any} context 地域コンテキスト。
 * @param {any} originPrefectures 都道府県配列。
 * @param {any} originAreaLabel 地方ラベル。
 * @returns {any} 選択結果。
 */
function resolveRecommendationSelections(
  context,
  originPrefectures,
  originAreaLabel
) {
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
  return { selectedPrefectures, selectedAreaLabel };
}

/**
 * 出発地ラベルを取得する。
 * @param {any} originSource 出発地座標。
 * @param {string} region 地域名。
 * @returns {Promise<string>} ラベルのPromise。
 */
async function resolveOriginLabelValue(originSource, region) {
  const localities = await resolveLocalityCandidates(originSource);
  const originLabelValue =
    (Array.isArray(localities) && localities[0]) || region || "";
  return originLabelValue;
}

/**
 * おすすめ取得のリクエストペイロードを作成する。
 * @param {any} options リクエストオプション。
 * @returns {Promise<any>} ペイロードのPromise。
 */
async function buildRecommendationPayload(
  /**
   * @type {{
   *   query?: any,
   *   mode?: any,
   *   targetMinutes?: any,
   *   adjustment?: any,
   *   actualMinutes?: any,
   *   originOverride?: any,
   *   originRegionOverride?: any,
   *   originPrefectures?: any,
   *   originAreaLabel?: any
   * }}
   */
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
  const originInfo = resolveRecommendationOrigin(originOverride);
  const region = await resolveRecommendationRegion(
    originInfo.originSource,
    originRegionOverride
  );
  const context = getSelectedRegionContext();
  const selection = resolveRecommendationSelections(
    context,
    originPrefectures,
    originAreaLabel
  );
  const originLabelValue = await resolveOriginLabelValue(
    originInfo.originSource,
    region
  );
  return {
    query,
    origin: {
      lat: originInfo.originLiteral.lat,
      lng: originInfo.originLiteral.lng,
    },
    originLabel: originLabelValue,
    originAreaLabel: selection.selectedAreaLabel,
    originPrefectures: selection.selectedPrefectures,
    maxMinutes,
    targetMinutes,
    mode,
    adjustment,
    actualMinutes,
    originRegion: region,
  };
}

/**
 * おすすめ取得APIを呼び出す。
 * @param {{
 *   query?: any,
 *   mode?: any,
 *   targetMinutes?: any,
 *   adjustment?: any,
 *   actualMinutes?: any,
 *   originOverride?: any,
 *   originRegionOverride?: any,
 *   originPrefectures?: any,
 *   originAreaLabel?: any
 * }} options リクエストオプション。
 * @returns {Promise<any>} APIレスポンスのPromise。
 */
async function requestRecommendation(
  /**
   * @type {{
   *   query?: any,
   *   mode?: any,
   *   targetMinutes?: any,
   *   adjustment?: any,
   *   actualMinutes?: any,
   *   originOverride?: any,
   *   originRegionOverride?: any,
   *   originPrefectures?: any,
   *   originAreaLabel?: any
   * }}
   */
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
  const payload = await buildRecommendationPayload({
    query,
    mode,
    targetMinutes,
    adjustment,
    actualMinutes,
    originOverride,
    originRegionOverride,
    originPrefectures,
    originAreaLabel,
  });
  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "おすすめ地点の取得に失敗しました。");
  }
  return data;
}

/**
 * 住所を座標に変換する。
 * @param {string} address 住所文字列。
 * @returns {Promise<any>} 座標のPromise。
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
 * おすすめ地点の住所から座標を取得する。
 * @param {any} place おすすめデータ。
 * @returns {Promise<any>} 座標のPromise。
 */
function geocodeDestination(place) {
  const address = [place?.name, place?.address].filter(Boolean).join(" ");
  return geocodeAddress(address);
}

/**
 * 立ち寄りデータを正規化する。
 * @param {any} stop 立ち寄りデータ。
 * @returns {any} 正規化済みの立ち寄り。
 */
function normalizeStop(stop) {
  let normalized = null;
  if (typeof stop === "string") {
    normalized = { name: stop, address: "" };
  } else if (stop && typeof stop === "object") {
    normalized = {
      name: stop.name || stop.title || "",
      address: stop.address || "",
      lat: stop.lat,
      lng: stop.lng,
    };
  }
  return normalized;
}

/**
 * 立ち寄り表示用ラベルを作成する。
 * @param {any} stop 立ち寄りデータ。
 * @returns {string} 表示ラベル。
 */
function getStopLabel(stop) {
  const normalized = normalizeStop(stop);
  let label = "";
  if (normalized) {
    label = [normalized.name, normalized.address].filter(Boolean).join(" ");
  }
  return label;
}

/**
 * 立ち寄りリストを座標化する。
 * @param {any} stops 立ち寄りリスト。
 * @returns {Promise<any[]>} 座標配列のPromise。
 */
async function geocodeStops(stops) {
  /** @type {any[]} */
  const locations = [];
  if (Array.isArray(stops)) {
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
  }
  return locations;
}

/**
 * 散歩ルート検索の前提を確認する。
 * @returns {boolean} 確認結果。
 */
function canStartWalkRoute() {
  let canStart = true;
  if (!originLatLng && !getSelectedRegionContext()?.label) {
    setRecommendHint(
      "地方または都道府県を選択するか、地図をクリックして出発地を指定してください。"
    );
    canStart = false;
  }
  return canStart;
}

/**
 * 目的地おすすめの検索を実行する。
 * @param {any} options 検索オプション。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function runSpotRecommendation(
  /** @type {{ query: string, mode: string, targetMinutes: number | null }} */
  { query, mode, targetMinutes }
) {
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

/**
 * おすすめフォーム送信を処理する。
 * @param {Event} event 送信イベント。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function handleRecommendSubmit(event) {
  event.preventDefault();

  const query = recommendQuery.value.trim();
  const isWalkRoute = !query;
  const mode = isWalkRoute ? "walk_route" : "spot";
  const targetMinutes = isWalkRoute ? getTargetMinutes() : null;
  let shouldProceed = true;

  if (!originLatLng && !isWalkRoute) {
    const ready = await ensureOriginFromRegion({ source: "recommend" });
    if (!ready) {
      shouldProceed = false;
    }
  }

  if (shouldProceed) {
    if (isWalkRoute) {
      const canStart = canStartWalkRoute();
      if (canStart) {
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
      }
    } else {
      await runSpotRecommendation({ query, mode, targetMinutes });
    }
  }
}

/**
 * ルート表示をクリアする。
 */
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

/**
 * 散歩ルート状態を初期化する。
 */
function clearWalkRouteState() {
  walkingWaypoints = null;
  walkRouteTargetMinutes = null;
  walkRouteRetryCount = 0;
  lastWalkQuery = "";
  desiredWalkTargetMinutes = null;
  walkRoutePreferredMode = null;
}

/**
 * 目的地をクリアして状態をリセットする。
 * @param {string} message 表示メッセージ。
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

/**
 * ルート全体をリセットする。
 */
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
 * 出発地を設定してマーカーを更新する。
 * @param {any} latLng 出発地座標。
 * @param {string | null} [regionOverride] 地域上書き。
 * @param {{ preserveWalkState?: boolean }} [options] 設定オプション。
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
 * 目的地を設定してマーカーを更新する。
 * @param {any} latLng 目的地座標。
 * @param {string} source 設定元。
 * @param {{ label?: string }} [options] 設定オプション。
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
 * ルートに新幹線等が含まれるか判定する。
 * @param {any} route ルート情報。
 * @returns {boolean} 高速鉄道判定。
 */
function routeHasHighSpeedTrain(route) {
  const legs = route?.legs || [];
  const highSpeedType =
    google.maps.TransitVehicleType?.HIGH_SPEED_TRAIN || "HIGH_SPEED_TRAIN";
  return legs.some((/** @type {any} */ leg) =>
    leg.steps?.some((/** @type {any} */ step) => {
      const travelMode = step.travel_mode;
      const isTransit =
        travelMode === google.maps.TravelMode.TRANSIT ||
        travelMode === "TRANSIT";
      const vehicleType = step.transit?.line?.vehicle?.type;
      return isTransit && vehicleType === highSpeedType;
    })
  );
}

/**
 * 在来線のみのルートを選択する。
 * @param {any} result 経路結果。
 * @returns {{ route: any, reason: string | null }} 選択結果と理由。
 */
function selectLocalRailRoute(result) {
  const routes = result?.routes || [];
  /** @type {{ route: any, reason: string | null }} */
  let selection = { route: null, reason: "no_route" };
  if (routes.length) {
    selection = { route: null, reason: "high_speed" };
    for (const route of routes) {
      if (!routeHasHighSpeedTrain(route)) {
        selection = { route, reason: null };
        break;
      }
    }
  }
  return selection;
}

/**
 * ルート結果の判定を行う。
 * @param {any} options 判定オプション。
 * @returns {any} 判定結果。
 */
function evaluateRouteSelection(
  /** @type {{ type: string, status: any, result: any }} */ { type, status, result }
) {
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
  return { routeResult, rejectReason, isOk };
}

/**
 * ルート結果を状態に反映する。
 * @param {any} options 反映オプション。
 */
function applyWalkRouteSuccess(
  /** @type {{ result: any, durationText: string, durationSeconds: number | null, flags: any }} */
  { result, durationText, durationSeconds, flags }
) {
  walkingValue.textContent = durationText;
  flags.walkOk = true;
  flags.walkSeconds = durationSeconds;
  flags.walkText = durationText;
  flags.walkResult = result;
  if (destinationSource !== "walk_multi" && walkingRenderer) {
    walkingRenderer.setDirections(result);
  }
}

/**
 * 在来線ルートの成功結果を反映する。
 * @param {any} options 反映オプション。
 */
function applyRailRouteSuccess(
  /** @type {{ routeResult: any, durationText: string, durationSeconds: number | null, flags: any }} */
  { routeResult, durationText, durationSeconds, flags }
) {
  railValue.textContent = durationText;
  flags.railOk = true;
  flags.railSeconds = durationSeconds;
  flags.railText = durationText;
  flags.railResult = routeResult;
  if (destinationSource !== "walk_multi" && railRenderer) {
    railRenderer.setDirections(routeResult);
  }
}

/**
 * 徒歩ルートの失敗結果を反映する。
 */
function applyWalkRouteFailure() {
  walkingValue.textContent = "経路なし";
  if (destinationSource !== "walk_multi" && walkingRenderer) {
    walkingRenderer.set("directions", null);
  }
}

/**
 * 在来線ルートの失敗結果を反映する。
 * @param {any} options 反映オプション。
 */
function applyRailRouteFailure(
  /** @type {{ rejectReason: string | null, flags: any }} */
  { rejectReason, flags }
) {
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

/**
 * ルート結果を状態に反映する。
 * @param {any} options 反映オプション。
 */
function applyRouteResultState(
  /**
   * @type {{
   *   type: string,
   *   isOk: boolean,
   *   routeResult: any,
   *   result: any,
   *   rejectReason: string | null,
   *   bounds: any,
   *   flags: any
   * }}
   */
  { type, isOk, routeResult, result, rejectReason, bounds, flags }
) {
  if (isOk) {
    const legs = routeResult.routes[0]?.legs || [];
    const { text: durationText, seconds: durationSeconds } =
      getRouteDurationFromLegs(legs);
    if (type === "walk") {
      applyWalkRouteSuccess({ result, durationText, durationSeconds, flags });
    } else {
      applyRailRouteSuccess({
        routeResult,
        durationText,
        durationSeconds,
        flags,
      });
    }

    if (routeResult.routes[0].bounds) {
      bounds.union(routeResult.routes[0].bounds);
    }
  } else if (type === "walk") {
    applyWalkRouteFailure();
  } else {
    applyRailRouteFailure({ rejectReason, flags });
  }
}

/**
 * 完了数を更新する。
 * @param {any} flags 進捗フラグ。
 * @returns {boolean} 完了判定。
 */
function incrementRouteCompletion(flags) {
  flags.completed += 1;
  return flags.completed >= flags.expected;
}

/**
 * 散歩ルートの目標分数を取得する。
 * @returns {number} 目標分数。
 */
function getWalkMultiTargetMinutes() {
  return (
    desiredWalkTargetMinutes ||
    walkRouteTargetMinutes ||
    getMaxMinutes() ||
    DEFAULT_WALK_TARGET_MINUTES
  );
}

/**
 * 散歩ルートの評価値を計算する。
 * @param {any} flags 進捗フラグ。
 * @param {number} targetMinutes 目標分数。
 * @returns {any} 評価値。
 */
function buildWalkMultiMetrics(flags, targetMinutes) {
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
  return {
    walkMinutes,
    railMinutes,
    tolerance,
    safeWalkDiff,
    safeRailDiff,
  };
}

/**
 * 散歩ルートの採用モードを選ぶ。
 * @param {any} options 判定オプション。
 * @returns {string | null} 採用モード。
 */
function resolveToleranceMode(
  /**
   * @type {{
   *   walkMinutes: number | null,
   *   railMinutes: number | null,
   *   tolerance: number,
   *   safeWalkDiff: number,
   *   safeRailDiff: number
   * }}
   */
  { walkMinutes, railMinutes, tolerance, safeWalkDiff, safeRailDiff }
) {
  let selectedMode = null;
  if (walkMinutes !== null && safeWalkDiff <= tolerance) {
    selectedMode = "walk";
  } else if (railMinutes !== null && safeRailDiff <= tolerance) {
    selectedMode = "rail";
  }
  return selectedMode;
}

/**
 * 散歩ルートの代替モードを判定する。
 * @param {any} options 判定オプション。
 * @returns {string | null} 採用モード。
 */
function resolveFallbackMode(
  /**
   * @type {{
   *   walkMinutes: number | null,
   *   railMinutes: number | null,
   *   targetMinutes: number,
   *   tolerance: number,
   *   safeWalkDiff: number,
   *   safeRailDiff: number,
   *   flags: any
   * }}
   */
  {
    walkMinutes,
    railMinutes,
    targetMinutes,
    tolerance,
    safeWalkDiff,
    safeRailDiff,
    flags,
  }
) {
  let selectedMode = null;
  if (walkMinutes !== null && railMinutes !== null) {
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
  return selectedMode;
}

/**
 * 散歩ルートの採用モードを選ぶ。
 * @param {any} options 判定オプション。
 * @returns {string | null} 採用モード。
 */
function selectWalkMultiMode(
  /**
   * @type {{
   *   walkMinutes: number | null,
   *   railMinutes: number | null,
   *   tolerance: number,
   *   safeWalkDiff: number,
   *   safeRailDiff: number,
   *   targetMinutes: number,
   *   flags: any
   * }}
   */
  { walkMinutes, railMinutes, tolerance, safeWalkDiff, safeRailDiff, targetMinutes, flags }
) {
  let selectedMode = resolveToleranceMode({
    walkMinutes,
    railMinutes,
    tolerance,
    safeWalkDiff,
    safeRailDiff,
  });
  if (!selectedMode) {
    selectedMode = resolveFallbackMode({
      walkMinutes,
      railMinutes,
      targetMinutes,
      tolerance,
      safeWalkDiff,
      safeRailDiff,
      flags,
    });
  }
  return selectedMode;
}

/**
 * 散歩ルートの選択結果を組み立てる。
 * @param {any} options 選択オプション。
 * @returns {any} 選択結果。
 */
function buildWalkMultiSelection(
  /** @type {{ flags: any, targetMinutes: number }} */ { flags, targetMinutes }
) {
  const metrics = buildWalkMultiMetrics(flags, targetMinutes);
  const selectedMode = selectWalkMultiMode({
    ...metrics,
    targetMinutes,
    flags,
  });
  const selectedMinutes =
    selectedMode === "rail" ? metrics.railMinutes : metrics.walkMinutes;
  const selectedText = selectedMode === "rail" ? flags.railText : flags.walkText;
  const selectedLabel =
    selectedMode === "rail" ? "散歩ルート（在来線併用）" : "散歩ルート";
  return {
    selectedMode,
    selectedMinutes,
    selectedText,
    selectedLabel,
    tolerance: metrics.tolerance,
  };
}

/**
 * 散歩ルートの選択結果を反映する。
 * @param {any} options 反映オプション。
 */
function applyWalkMultiSelection(
  /** @type {{ selection: any, flags: any }} */ { selection, flags }
) {
  const selectedMode = selection.selectedMode;
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
}

/**
 * 散歩ルートの時間調整を処理する。
 * @param {any} options 判定オプション。
 * @returns {boolean} 最終確定するか。
 */
function handleWalkMultiTiming(
  /** @type {{ selection: any, targetMinutes: number }} */ { selection, targetMinutes }
) {
  let shouldFinalize = true;
  const selectedMinutes = selection.selectedMinutes;
  if (selectedMinutes !== null) {
    const diff = Math.abs(selectedMinutes - targetMinutes);
    if (diff <= selection.tolerance) {
      setRouteStatus(
        `${selection.selectedLabel}: 約${selection.selectedText}（目標${targetMinutes}分）`
      );
      walkRouteRetryCount = 0;
    } else if (walkRouteRetryCount < WALK_ROUTE_MAX_RETRIES) {
      walkRouteRetryCount += 1;
      const adjustment = selectedMinutes < targetMinutes ? "longer" : "shorter";
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
      shouldFinalize = false;
    } else {
      setRouteStatus(
        `${selection.selectedLabel}: 約${selection.selectedText}（目標${targetMinutes}分から${diff}分ずれ）`
      );
      setRecommendHint("時間が合わない場合は再検索してください。");
    }
  } else {
    setRouteStatus("散歩ルートの所要時間を表示中です。");
  }
  return shouldFinalize;
}

/**
 * 散歩ルートの完了処理を行う。
 * @param {any} options 完了オプション。
 * @returns {boolean} 続行可否。
 */
function handleWalkMultiCompletion(
  /** @type {{ flags: any }} */ { flags }
) {
  let shouldFinalize = true;
  if (flags.walkOk) {
    const targetMinutes = getWalkMultiTargetMinutes();
    const selection = buildWalkMultiSelection({ flags, targetMinutes });
    applyWalkMultiSelection({ selection, flags });
    shouldFinalize = handleWalkMultiTiming({ selection, targetMinutes });
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
  return shouldFinalize;
}

/**
 * 通常ルートの状態文言を取得する。
 * @param {any} flags 進捗フラグ。
 * @returns {string} 状態文言。
 */
function getStandardRouteStatusMessage(flags) {
  let message = "";
  if (flags.railRejected === "high_speed") {
    message = flags.walkOk
      ? "新幹線が含まれるため在来線ルートを除外しました。徒歩のみ表示しています。"
      : "新幹線が含まれるため在来線ルートを除外しました。";
  } else if (flags.walkOk && flags.railOk) {
    message = "徒歩と在来線の所要時間を表示中です。";
  } else if (!flags.walkOk && !flags.railOk) {
    message = "経路が見つかりませんでした。";
  } else if (!flags.walkOk) {
    message = "徒歩経路が見つかりませんでした。";
  } else {
    message = "在来線経路が見つかりませんでした。";
  }
  return message;
}

/**
 * 所要時間の上限判定を反映する。
 * @param {any} flags 進捗フラグ。
 */
function evaluateRouteLimit(
  /** @type {{ flags: any, maxMinutes: number | null }} */ { flags, maxMinutes }
) {
  let shouldCheck = false;
  let walkWithin = false;
  let railWithin = false;
  if (maxMinutes && (flags.walkOk || flags.railOk)) {
    const limitSeconds = maxMinutes * 60;
    walkWithin =
      typeof flags.walkSeconds === "number" &&
      flags.walkSeconds <= limitSeconds;
    railWithin =
      typeof flags.railSeconds === "number" &&
      flags.railSeconds <= limitSeconds;
    shouldCheck = true;
  }
  return { shouldCheck, walkWithin, railWithin, maxMinutes };
}

/**
 * 所要時間の上限メッセージを反映する。
 * @param {any} options 判定オプション。
 * @param {any} flags 進捗フラグ。
 */
function applyRouteLimitMessage(
  /** @type {{ maxMinutes: number | null, walkWithin: boolean, railWithin: boolean }} */
  { maxMinutes, walkWithin, railWithin },
  flags
) {
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

/**
 * 所要時間の上限判定を反映する。
 * @param {any} flags 進捗フラグ。
 */
function applyStandardRouteLimits(flags) {
  const maxMinutes = getMaxMinutes();
  const limitState = evaluateRouteLimit({ flags, maxMinutes });
  if (limitState.shouldCheck) {
    applyRouteLimitMessage(limitState, flags);
  }
}

/**
 * ルート内訳の表示を更新する。
 * @param {any} flags 進捗フラグ。
 */
function updateStandardRouteBreakdown(flags) {
  if (flags.railOk && !flags.railRejected) {
    updateRouteBreakdown({ mode: "rail", railResult: flags.railResult });
  } else if (flags.walkOk) {
    updateRouteBreakdown({ mode: "walk", railResult: flags.railResult });
  } else {
    clearRouteBreakdown();
  }
}

/**
 * 表示範囲を調整する。
 * @param {any} bounds 表示範囲。
 */
function fitBoundsIfNeeded(bounds) {
  if (!bounds.isEmpty() && destinationLatLng) {
    map.fitBounds(bounds, 80);
  }
}

/**
 * 通常ルートの完了処理を行う。
 * @param {any} options 完了オプション。
 */
function handleStandardCompletion(
  /** @type {{ flags: any, bounds: any }} */ { flags, bounds }
) {
  const message = getStandardRouteStatusMessage(flags);
  if (message) {
    setRouteStatus(message);
  }
  applyStandardRouteLimits(flags);
  updateStandardRouteBreakdown(flags);
  fitBoundsIfNeeded(bounds);
}

/**
 * 完了後の後処理を実行する。
 * @param {any} options 完了オプション。
 * @returns {boolean} 続行可否。
 */
function finalizeRouteCompletion(
  /** @type {{ flags: any, bounds: any }} */ { flags, bounds }
) {
  let shouldFinalize = true;
  if (destinationSource === "walk_multi") {
    shouldFinalize = handleWalkMultiCompletion({ flags });
  } else {
    handleStandardCompletion({ flags, bounds });
  }
  return shouldFinalize;
}

/**
 * ルート検索結果を反映する。
 * @param {{ type: string, result: any, status: any, bounds: any, flags: any, currentRequest: number }} options 結果オプション。
 */
function handleRouteResult(options) {
  const { type, result, status, bounds, flags, currentRequest } = options;
  if (currentRequest === requestId) {
    const evaluation = evaluateRouteSelection({ type, status, result });
    applyRouteResultState({
      type,
      isOk: evaluation.isOk,
      routeResult: evaluation.routeResult,
      result,
      rejectReason: evaluation.rejectReason,
      bounds,
      flags,
    });
    const isComplete = incrementRouteCompletion(flags);
    if (isComplete) {
      finalizeRouteCompletion({ flags, bounds });
    }
  }
}

/**
 * ルート判定フラグを初期化する。
 * @param {boolean} includeTransit 乗換ルート有無。
 * @returns {any} フラグオブジェクト。
 */
function buildRouteFlags(includeTransit) {
  return {
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
}

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

/**
 * Google Maps APIスクリプトを読み込む。
 * @param {string} apiKey APIキー。
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

/**
 * Google Mapsの初期化処理を行う。
 */
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
    } else if (!destinationLatLng) {
      setDestination(event.latLng, "manual");
      updateRouteLabels();
      updateRouteHint();
      calculateRoutes();
    } else {
      resetRoute();
      setOrigin(event.latLng);
      updateRouteLabels();
      updateRouteHint();
    }
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
