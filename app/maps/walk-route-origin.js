/* exported getAdjustedTargetMinutes, buildWalkRouteRegionInfo, resolveWalkRouteOriginStatus */
/* exported resolveWalkRouteOriginOverride, fetchWalkRouteRecommendation, resolveWalkRouteLocations */
/* exported applyWalkRouteOriginFromStops */
/* global findNearestStationToLocation: writable, formatRegionForPrompt: writable, geocodeStops: writable */
/* global getSelectedRegionContext: writable, originLatLng: writable, originRegion: writable */
/* global requestRecommendation: writable, resolveIsOriginInRegion: writable, resolveRegionAnchor: writable */
/* global setOrigin: writable, setOriginRegionHint: writable, updateRouteHint: writable, updateRouteLabels: writable */
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