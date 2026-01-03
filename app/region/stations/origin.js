/**
 * 駅候補から出発地を選ぶ処理をまとめる。
 * @file 駅候補から出発地を選ぶ処理をまとめる。
 */
/* exported canUseOriginRegionContext, resolveStationFromContext, applyOriginFromStation, ensureOriginFromRegion */
/* exported handleOriginRegionStart */
/* global DEFAULT_ZOOM: writable, findNearestStationToLocation: writable, findStationInRegion: writable */
/* global getSelectedRegionContext: writable, map: writable, originLatLng: writable, originRegionHint: writable */
/* global resolveRegionAnchor: writable, setOrigin: writable, setOriginRegionHint: writable */
/* global setRecommendHint: writable, updateRouteHint: writable, updateRouteLabels: writable */
/**
 * 地域指定の入力条件を確認する。
 * @param {any} options 判定オプション。
 * @returns {boolean} 判定結果。
 */
function canUseOriginRegionContext(
  /** @type {{ context: any, source?: string }} */ { context, source }
) {
  // canProceedの初期値を定義する。
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
  // stationの初期値を定義する。
  let station = null;
  if (context?.label) {
    // regionLabelの参照を保持する。
    const regionLabel = context.label;
    // regionFilterを条件で選ぶ。
    const regionFilter = context.prefectures || context.label;
    if (context.anchor) {
      // anchorLocationを解決する。
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
  // 判定結果の初期値を定義する。
  let isReady = false;
  // regionLabelを条件で選ぶ。
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
    // stationLabelを条件で選ぶ。
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
  // 判定結果を取得する。
  let isReady = Boolean(originLatLng);
  if (!isReady) {
    // メッセージを取得する。
    const context = getSelectedRegionContext({ refreshAnchor: true });
    // オプションを条件で選ぶ。
    const contextOptions =
      typeof source === "string" ? { context, source } : { context };
    // canProceedを取得する。
    const canProceed = canUseOriginRegionContext(contextOptions);
    if (canProceed) {
      // regionLabelの参照を保持する。
      const regionLabel = context.label;
      setOriginRegionHint(`${regionLabel}の駅を探しています...`);
      // stationを解決する。
      const station = await resolveStationFromContext(context);
      // オプションを条件で選ぶ。
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