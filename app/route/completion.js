/**
 * ルート確定後の処理をまとめる。
 * @file ルート確定後の処理をまとめる。
 */
/* exported getStandardRouteStatusMessage, evaluateRouteLimit, applyRouteLimitMessage, applyStandardRouteLimits */
/* exported updateStandardRouteBreakdown, fitBoundsIfNeeded, handleStandardCompletion, finalizeRouteCompletion */
/* exported handleRouteResult, buildRouteFlags */
/* global applyRouteResultState: writable, clearDestination: writable, clearRouteBreakdown: writable */
/* global destinationLatLng: writable, destinationSource: writable, evaluateRouteSelection: writable */
/* global getMaxMinutes: writable, handleWalkMultiCompletion: writable, incrementRouteCompletion: writable */
/* global map: writable, requestId: writable, setRecommendHint: writable, setRouteStatus: writable */
/* global updateRouteBreakdown: writable */
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
    if (shouldFinalize) {
      fitBoundsIfNeeded(bounds);
    }
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
