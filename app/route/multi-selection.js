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
  // previousModeの参照を保持する。
  const previousMode = walkRoutePreferredMode;
  walkRoutePreferredMode = mode;
  return previousMode;
}

/**
 * 散歩ルート判定のログを出力する。
 * @param {string} label ログラベル。
 * @param {any} details 詳細情報。
 */
function logWalkMultiDecision(label, details) {
  console.warn(`[walk_multi] ${label}`, details);
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
  // selectedModeを解決する。
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
  // metricsを作成する。
  const metrics = buildWalkMultiMetrics(flags, targetMinutes);
  // selectedModeを取得する。
  const selectedMode = selectWalkMultiMode({
    ...metrics,
    targetMinutes,
    flags,
  });
  // selectedMinutesを条件で選ぶ。
  const selectedMinutes =
    selectedMode === "rail" ? metrics.railMinutes : metrics.walkMinutes;
  // メッセージを条件で選ぶ。
  const selectedText = selectedMode === "rail" ? flags.railText : flags.walkText;
  // selectedLabelを条件で選ぶ。
  const selectedLabel =
    selectedMode === "rail" ? "散歩ルート（在来線併用）" : "散歩ルート";
  logWalkMultiDecision("selection", {
    targetMinutes,
    tolerance: metrics.tolerance,
    selectedMode,
    selectedMinutes,
    walkMinutes: metrics.walkMinutes,
    railMinutes: metrics.railMinutes,
    safeWalkDiff: metrics.safeWalkDiff,
    safeRailDiff: metrics.safeRailDiff,
  });
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
  // selectedModeの参照を保持する。
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
  // 判定結果の初期値を定義する。
  let shouldFinalize = true;
  // selectedMinutesの参照を保持する。
  const selectedMinutes = selection.selectedMinutes;
  if (selectedMinutes !== null) {
    // diffを取得する。
    const diff = Math.abs(selectedMinutes - targetMinutes);
    // diffRoundedを用意する。
    const diffRounded = Math.round(diff * 10) / 10;
    logWalkMultiDecision("timing check", {
      selectedMode: selection.selectedMode,
      targetMinutes,
      selectedMinutes,
      tolerance: selection.tolerance,
      diff,
      diffRounded,
      retryCount: walkRouteRetryCount,
      maxRetries: WALK_ROUTE_MAX_RETRIES,
    });
    if (diff <= selection.tolerance) {
      setRouteStatus(
        `${selection.selectedLabel}: 約${selection.selectedText}（目標${targetMinutes}分）`
      );
      walkRouteRetryCount = 0;
    } else if (walkRouteRetryCount < WALK_ROUTE_MAX_RETRIES) {
      walkRouteRetryCount += 1;
      // adjustmentを条件で選ぶ。
      const adjustment = selectedMinutes < targetMinutes ? "longer" : "shorter";
      // リクエストを取得する。
      const requestTargetMinutes = getAdjustedTargetMinutes(
        targetMinutes,
        selectedMinutes
      );
      logWalkMultiDecision("retry", {
        adjustment,
        requestTargetMinutes,
        desiredTargetMinutes: targetMinutes,
        actualMinutes: selectedMinutes,
        retryCount: walkRouteRetryCount,
      });
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
  // 判定結果の初期値を定義する。
  let shouldFinalize = true;
  logWalkMultiDecision("route flags", {
    walkOk: flags.walkOk,
    railOk: flags.railOk,
    walkSeconds: flags.walkSeconds,
    railSeconds: flags.railSeconds,
    walkText: flags.walkText,
    railText: flags.railText,
    railRejected: flags.railRejected,
    retryCount: walkRouteRetryCount,
  });
  if (flags.walkOk) {
    // targetMinutesを取得する。
    const targetMinutes = getWalkMultiTargetMinutes();
    // selectionを作成する。
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
