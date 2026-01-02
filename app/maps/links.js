/* exported buildMapsLink, formatLatLngForUrl, formatDurationText, getRouteDurationFromLegs, getLatLngLiteral */
/* exported computeDistanceMeters, buildDirectionsLink, GENERIC_POINT_LABELS, normalizePointLabel */
/* exported buildSegmentSearchQuery, getOriginDisplayLabel, getDestinationDisplayLabel */
/* global destinationLatLng: writable, destinationName: writable, originRegion: writable */
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