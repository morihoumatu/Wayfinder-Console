/**
 * おすすめ地点のジオコード処理をまとめる。
 * @file おすすめ地点のジオコード処理をまとめる。
 */
/* exported geocodeAddress, geocodeDestination, normalizeStop, getStopLabel, geocodeStops, canStartWalkRoute */
/* exported runSpotRecommendation, handleRecommendSubmit */
/* global calculateRoutes: writable, clearRecommendResult: writable, desiredWalkTargetMinutes: writable */
/* global ensureOriginFromRegion: writable, geocoder: writable, getSelectedRegionContext: writable */
/* global getTargetMinutes: writable, lastWalkQuery: writable, originLatLng: writable, recommendQuery: writable */
/* global requestRecommendation: writable, runWalkRouteSearch: writable, setDestination: writable */
/* global setRecommendHint: writable, setRecommendLoading: writable, showRecommendResult: writable */
/* global updateRouteHint: writable, updateRouteLabels: writable, updateRouteLinks: writable */
/* global walkRouteRetryCount: writable */
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
  // addressを取得する。
  const address = [place?.name, place?.address].filter(Boolean).join(" ");
  return geocodeAddress(address);
}

/**
 * 立ち寄りデータを正規化する。
 * @param {any} stop 立ち寄りデータ。
 * @returns {any} 正規化済みの立ち寄り。
 */
function normalizeStop(stop) {
  // normalizedの初期値を定義する。
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
  // normalizedを正規化する。
  const normalized = normalizeStop(stop);
  // labelの初期値を定義する。
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
    // limitを取得する。
    const limit = Math.min(stops.length, 6);
    // iをループ用に用意する。
    for (let i = 0; i < limit; i += 1) {
      // normalizedを正規化する。
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
      // addressを取得する。
      const address = [normalized.name, normalized.address]
        .filter(Boolean)
        .join(" ");
      try {
        // locationを取得する。
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
  // canStartの初期値を定義する。
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
    // データを取得する。
    const data = await requestRecommendation({ query, mode, targetMinutes });
    if (!data?.place) {
      throw new Error("おすすめ地点の取得に失敗しました。");
    }
    showRecommendResult(data.place);
    // locationを取得する。
    const location = await geocodeDestination(data.place);
    // destinationLabelValueを取得する。
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
    // メッセージを条件で選ぶ。
    const message = error instanceof Error ? error.message : String(error);
    setRecommendHint(message || "おすすめ地点の取得に失敗しました。");
  } finally {
    setRecommendLoading(false);
  }
}

/**
 * 散歩ルート検索の状態を更新する。
 * @param {string} query 検索クエリ。
 * @param {number | null} targetMinutes 目標時間。
 * @returns {any} 更新後の状態。
 */
function updateWalkRouteSearchState(query, targetMinutes) {
  lastWalkQuery = query;
  walkRouteRetryCount = 0;
  desiredWalkTargetMinutes = targetMinutes;
  return {
    lastWalkQuery,
    walkRouteRetryCount,
    desiredWalkTargetMinutes,
  };
}

/**
 * おすすめフォーム送信を処理する。
 * @param {Event} event 送信イベント。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function handleRecommendSubmit(event) {
  event.preventDefault();

  // queryを取得する。
  const query = recommendQuery.value.trim();
  // 判定結果を用意する。
  const isWalkRoute = !query;
  // modeを条件で選ぶ。
  const mode = isWalkRoute ? "walk_route" : "spot";
  // targetMinutesを条件で選ぶ。
  const targetMinutes = isWalkRoute ? getTargetMinutes() : null;
  // 判定結果の初期値を定義する。
  let shouldProceed = true;

  if (!originLatLng && !isWalkRoute) {
    // readyを取得する。
    const ready = await ensureOriginFromRegion({ source: "recommend" });
    if (!ready) {
      shouldProceed = false;
    }
  }

  if (shouldProceed) {
    if (isWalkRoute) {
      // canStartを取得する。
      const canStart = canStartWalkRoute();
      if (canStart) {
        updateWalkRouteSearchState(query, targetMinutes);
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
