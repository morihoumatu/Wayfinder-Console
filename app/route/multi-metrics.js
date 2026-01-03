/**
 * 複数ルートの時間計算をまとめる。
 * @file 複数ルートの時間計算をまとめる。
 */
/* exported getWalkMultiTargetMinutes, buildWalkMultiMetrics, resolveToleranceMode, resolveFallbackMode */
/* global DEFAULT_WALK_TARGET_MINUTES: writable, desiredWalkTargetMinutes: writable, getMaxMinutes: writable */
/* global walkRouteTargetMinutes: writable */
/**
 * 散歩ルートの許容差を取得する。
 * @param {number} targetMinutes 目標分数。
 * @returns {number} 許容差（分）。
 */
function resolveWalkMultiTolerance(targetMinutes) {
  let tolerance = 8;
  if (Number.isFinite(targetMinutes) && targetMinutes > 0) {
    tolerance = Math.max(8, Math.round(targetMinutes * 0.1));
  }
  return tolerance;
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
    typeof flags.walkSeconds === "number" ? flags.walkSeconds / 60 : null;
  const railMinutes =
    typeof flags.railSeconds === "number" ? flags.railSeconds / 60 : null;
  const tolerance = resolveWalkMultiTolerance(targetMinutes);
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
