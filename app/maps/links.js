/**
 * 地図リンクの表示更新をまとめる。
 * @file 地図リンクの表示更新をまとめる。
 */
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
  // valueの初期値を定義する。
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
  // メッセージの初期値を定義する。
  let text = "不明";
  if (Number.isFinite(totalSeconds)) {
    // 件数を取得する。
    const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
    if (totalMinutes < 60) {
      text = `${totalMinutes}分`;
    } else {
      // hoursを取得する。
      const hours = Math.floor(totalMinutes / 60);
      // minutesを用意する。
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
    // 件数の初期値を定義する。
    let totalSeconds = 0;
    // 判定結果の初期値を定義する。
    let hasSeconds = false;
    legs.forEach((leg) => {
      // valueを用意する。
      const value = leg?.duration?.value;
      if (typeof value === "number") {
        totalSeconds += value;
        hasSeconds = true;
      }
    });
    if (hasSeconds) {
      summary = { text: formatDurationText(totalSeconds), seconds: totalSeconds };
    } else {
      // メッセージを用意する。
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
  // literalの初期値を定義する。
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
  // distanceの初期値を定義する。
  let distance = null;
  if (a && b) {
    // toRadiansの処理を定義する。
    const toRadians = (/** @type {number} */ value) => (value * Math.PI) / 180;
    // 座標Aの緯度をラジアンに変換する。
    const lat1 = toRadians(a.lat);
    // lat2を整形する。
    const lat2 = toRadians(b.lat);
    // deltaLatを用意する。
    const deltaLat = lat2 - lat1;
    // deltaLngを整形する。
    const deltaLng = toRadians(b.lng - a.lng);
    // sinLatを取得する。
    const sinLat = Math.sin(deltaLat / 2);
    // sinLngを取得する。
    const sinLng = Math.sin(deltaLng / 2);
    // hを用意する。
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
  // URLSearchParamsのインスタンスを作成する。
  const params = new URLSearchParams({ api: "1" });
  // originValueを整形する。
  const originValue = formatLatLngForUrl(origin);
  // destinationValueを整形する。
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
    // waypointValuesを取得する。
    const waypointValues = waypoints
      .map((point) => formatLatLngForUrl(point))
      .filter(Boolean);
    if (waypointValues.length) {
      params.set("waypoints", waypointValues.join("|"));
    }
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Setのインスタンスを作成する。
const GENERIC_POINT_LABELS = new Set(["出発地", "目的地", "未選択", "不明"]);

/**
 * ポイントラベルを正規化する。
 * @param {any} label ラベル値。
 * @returns {string} 正規化ラベル。
 */
function normalizePointLabel(label) {
  // normalizedの初期値を定義する。
  let normalized = "";
  if (typeof label === "string") {
    // trimmedを取得する。
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
  // labelsを取得する。
  const labels = [normalizePointLabel(fromLabel), normalizePointLabel(toLabel)].filter(
    Boolean
  );
  // queryの初期値を定義する。
  let query = "";
  if (labels.length) {
    query = labels.join(" ");
  } else {
    // fromValueを整形する。
    const fromValue = formatLatLngForUrl(from);
    // toValueを整形する。
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
  // labelを条件で選ぶ。
  let label = destinationLatLng ? "目的地" : "";
  if (destinationName) {
    label = destinationName;
  }
  return label;
}
