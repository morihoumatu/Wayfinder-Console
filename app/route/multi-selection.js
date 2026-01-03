/**
 * 複数ルートの採用判定をまとめる。
 * @file 複数ルートの採用判定をまとめる。
 */
/* exported selectWalkMultiMode, buildWalkMultiSelection, applyWalkMultiSelection, handleWalkMultiTiming */
/* exported handleWalkMultiCompletion */
/* global WALK_ROUTE_MAX_RETRIES: writable, buildWalkMultiMetrics: writable, clearRouteBreakdown: writable */
/* global getAdjustedTargetMinutes: writable, getWalkMultiTargetMinutes: writable, lastWalkQuery: writable */
/* global railRenderer: writable, resolveFallbackMode: writable, resolveToleranceMode: writable */
/* global runWalkRouteSearch: writable, setRecommendHint: writable, setRouteStatus: writable */
/* global updateRouteBreakdown: writable, updateRouteLinks: writable, walkRoutePreferredMode: writable */
/* global walkRouteRetryCount: writable, walkingRenderer: writable */
/**
 * 散歩ルートの優先モードを更新する。
 * @param {string | null} mode 優先モード。
 * @returns {string | null} 直前の優先モード。
 */
function setWalkRoutePreferredMode(mode) {
  const previousMode = walkRoutePreferredMode;
  walkRoutePreferredMode = mode;
  return previousMode;
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
  setWalkRoutePreferredMode(selectedMode || "walk");
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
    const diffRounded = Math.round(diff * 10) / 10;
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
        `${selection.selectedLabel}: 約${selection.selectedText}（目標${targetMinutes}分から${diffRounded}分ずれ）`
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
    setWalkRoutePreferredMode("rail");
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
    setWalkRoutePreferredMode(null);
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
