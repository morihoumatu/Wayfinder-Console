/**
 * 散歩ルートの出発地補助処理をまとめる。
 * @file 散歩ルートの出発地補助処理をまとめる。
 */
/* exported applyOriginFromStartLocation, applyOriginFromStationCandidate */
/* exported buildOriginDistanceLimit, buildOriginRelocationInfo, resolveOriginDistanceMeters */
/* global computeDistanceMeters: writable, getLatLngLiteral: writable, originLatLng: writable */
/* global setOrigin: writable, setOriginRegionHint: writable */
/**
 * 目標分数から出発地の距離上限を算出する。
 * @param {number | null} targetMinutes 目標分数。
 * @returns {number | null} 距離上限(メートル)またはnull。
 */
function buildOriginDistanceLimit(targetMinutes) {
  let limit = null;
  if (typeof targetMinutes === "number" && Number.isFinite(targetMinutes) && targetMinutes > 0) {
    const estimatedMeters = targetMinutes * 80;
    limit = Math.max(4000, Math.round(estimatedMeters * 1.4));
  }
  return limit;
}

/**
 * 出発地と散歩開始地点の距離を算出する。
 * @param {any} startLocation 散歩開始地点。
 * @returns {number | null} 距離メートルまたはnull。
 */
function resolveOriginDistanceMeters(startLocation) {
  let distance = null;
  const originLiteral = getLatLngLiteral(originLatLng);
  const startLiteral = getLatLngLiteral(startLocation);
  if (originLiteral && startLiteral) {
    distance = computeDistanceMeters(originLiteral, startLiteral);
  }
  return distance;
}

/**
 * 出発地の再設定が必要か判定する。
 * @param {boolean} originMissing 出発地不足フラグ。
 * @param {any} startLocation 散歩開始地点。
 * @param {number | null} targetMinutes 目標分数。
 * @returns {{
 *   shouldRelocate: boolean,
 *   prefix: string,
 *   originTooFar: boolean,
 *   originDistance: number | null,
 *   distanceLimit: number | null
 * }} 判定結果。
 */
function buildOriginRelocationInfo(originMissing, startLocation, targetMinutes) {
  const distanceLimit = buildOriginDistanceLimit(targetMinutes);
  const originDistance = resolveOriginDistanceMeters(startLocation);
  const originTooFar =
    distanceLimit !== null &&
    originDistance !== null &&
    originDistance > distanceLimit;
  const shouldRelocate = originMissing || originTooFar;
  const prefix = originTooFar && !originMissing ? "出発地が遠いため、" : "";
  return {
    shouldRelocate,
    prefix,
    originTooFar,
    originDistance,
    distanceLimit,
  };
}

/**
 * 駅候補を出発地として反映する。
 * @param {any} options 反映オプション。
 */
function applyOriginFromStationCandidate(
  /** @type {{ station: any, regionLabel: string, originRegionOverride: string | null, prefix: string }} */
  { station, regionLabel, originRegionOverride, prefix }
) {
  setOrigin(station.location, regionLabel || originRegionOverride, {
    preserveWalkState: true,
  });
  setOriginRegionHint(
    station.name
      ? `${prefix}${station.name}を出発地に設定しました。`
      : `${prefix}最寄り駅を出発地に設定しました。`
  );
}

/**
 * 最初の地点を出発地として反映する。
 * @param {any} options 反映オプション。
 */
function applyOriginFromStartLocation(
  /** @type {{ startLocation: any, regionLabel: string, originRegionOverride: string | null, prefix: string }} */
  { startLocation, regionLabel, originRegionOverride, prefix }
) {
  setOrigin(startLocation, regionLabel || originRegionOverride, {
    preserveWalkState: true,
  });
  setOriginRegionHint(
    `${prefix}最寄り駅が見つからないため最初の地点から開始します。`
  );
}
