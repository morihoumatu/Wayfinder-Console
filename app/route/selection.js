/**
 * ルート選択時の表示更新をまとめる。
 * @file ルート選択時の表示更新をまとめる。
 */
/* exported routeHasHighSpeedTrain, selectLocalRailRoute, evaluateRouteSelection, applyWalkRouteSuccess */
/* exported applyRailRouteSuccess, applyWalkRouteFailure, applyRailRouteFailure, applyRouteResultState */
/* exported incrementRouteCompletion */
/* global destinationSource: writable, formatDurationText: writable, getRouteDurationFromLegs: writable */
/* global railRenderer: writable, railValue: writable, walkingRenderer: writable, walkingValue: writable */
/**
 * ルートに新幹線等が含まれるか判定する。
 * @param {any} route ルート情報。
 * @returns {boolean} 高速鉄道判定。
 */
function routeHasHighSpeedTrain(route) {
  // legsを条件で選ぶ。
  const legs = route?.legs || [];
  // highSpeedTypeを条件で選ぶ。
  const highSpeedType =
    google.maps.TransitVehicleType?.HIGH_SPEED_TRAIN || "HIGH_SPEED_TRAIN";
  return legs.some((/** @type {any} */ leg) =>
    leg.steps?.some((/** @type {any} */ step) => {
      // 移動手段を取得する。
      const travelMode = step.travel_mode;
      // 判定結果を条件で選ぶ。
      const isTransit =
        travelMode === google.maps.TravelMode.TRANSIT ||
        travelMode === "TRANSIT";
      // vehicleTypeを用意する。
      const vehicleType = step.transit?.line?.vehicle?.type;
      return isTransit && vehicleType === highSpeedType;
    })
  );
}

/**
 * 在来線のみのルートを選択する。
 * @param {any} result 経路結果。
 * @returns {{ route: any, reason: string | null }} 選択結果と理由。
 */
function selectLocalRailRoute(result) {
  // routesを条件で選ぶ。
  const routes = result?.routes || [];
  /** @type {{ route: any, reason: string | null }} */
  let selection = { route: null, reason: "no_route" };
  if (routes.length) {
    selection = { route: null, reason: "high_speed" };
    // routeをループ用に用意する。
    for (const route of routes) {
      if (!routeHasHighSpeedTrain(route)) {
        selection = { route, reason: null };
        break;
      }
    }
  }
  return selection;
}

/**
 * ルート結果の判定を行う。
 * @param {any} options 判定オプション。
 * @returns {any} 判定結果。
 */
function evaluateRouteSelection(
  /** @type {{ type: string, status: any, result: any }} */ { type, status, result }
) {
  // 結果の参照を保持する。
  let routeResult = result;
  // rejectReasonの初期値を定義する。
  let rejectReason = null;
  if (type === "rail" && status === "OK" && result?.routes?.length) {
    // selectionを取得する。
    const selection = selectLocalRailRoute(result);
    if (!selection.route) {
      rejectReason = selection.reason;
    } else if (selection.route !== result.routes[0]) {
      routeResult = { ...result, routes: [selection.route] };
    }
  }
  // 判定結果を条件で選ぶ。
  const isOk = status === "OK" && routeResult?.routes?.[0] && !rejectReason;
  return { routeResult, rejectReason, isOk };
}

/**
 * ルート結果を状態に反映する。
 * @param {any} options 反映オプション。
 */
function applyWalkRouteSuccess(
  /** @type {{ result: any, durationText: string, durationSeconds: number | null, flags: any }} */
  { result, durationText, durationSeconds, flags }
) {
  walkingValue.textContent = durationText;
  flags.walkOk = true;
  flags.walkSeconds = durationSeconds;
  flags.walkText = durationText;
  flags.walkResult = result;
  if (destinationSource !== "walk_multi" && walkingRenderer) {
    walkingRenderer.setDirections(result);
  }
}

/**
 * 在来線ルートの成功結果を反映する。
 * @param {any} options 反映オプション。
 */
function applyRailRouteSuccess(
  /** @type {{ routeResult: any, durationText: string, durationSeconds: number | null, flags: any }} */
  { routeResult, durationText, durationSeconds, flags }
) {
  // メッセージの参照を保持する。
  let adjustedText = durationText;
  // adjustedSecondsの参照を保持する。
  let adjustedSeconds = durationSeconds;
  // extraSecondsの参照を保持する。
  const extraSeconds = flags.railExtraSeconds;
  if (
    typeof durationSeconds === "number" &&
    typeof extraSeconds === "number" &&
    extraSeconds > 0
  ) {
    adjustedSeconds = durationSeconds + extraSeconds;
    adjustedText = formatDurationText(adjustedSeconds);
  }
  railValue.textContent = adjustedText;
  flags.railOk = true;
  flags.railSeconds = adjustedSeconds;
  flags.railText = adjustedText;
  flags.railResult = routeResult;
  if (destinationSource !== "walk_multi" && railRenderer) {
    railRenderer.setDirections(routeResult);
  }
}

/**
 * 徒歩ルートの失敗結果を反映する。
 */
function applyWalkRouteFailure() {
  walkingValue.textContent = "経路なし";
  if (destinationSource !== "walk_multi" && walkingRenderer) {
    walkingRenderer.set("directions", null);
  }
}

/**
 * 在来線ルートの失敗結果を反映する。
 * @param {any} options 反映オプション。
 */
function applyRailRouteFailure(
  /** @type {{ rejectReason: string | null, flags: any }} */
  { rejectReason, flags }
) {
  if (rejectReason === "high_speed") {
    railValue.textContent = "新幹線除外";
    flags.railRejected = "high_speed";
  } else {
    railValue.textContent = "経路なし";
  }
  if (destinationSource !== "walk_multi" && railRenderer) {
    railRenderer.set("directions", null);
  }
}

/**
 * ルート結果を状態に反映する。
 * @param {any} options 反映オプション。
 */
function applyRouteResultState(
  /**
   * @type {{
   *   type: string,
   *   isOk: boolean,
   *   routeResult: any,
   *   result: any,
   *   rejectReason: string | null,
   *   bounds: any,
   *   flags: any
   * }}
   */
  { type, isOk, routeResult, result, rejectReason, bounds, flags }
) {
  if (isOk) {
    // legsを条件で選ぶ。
    const legs = routeResult.routes[0]?.legs || [];
    // メッセージを取得する。
    const { text: durationText, seconds: durationSeconds } =
      getRouteDurationFromLegs(legs);
    if (type === "walk") {
      applyWalkRouteSuccess({ result, durationText, durationSeconds, flags });
    } else {
      applyRailRouteSuccess({
        routeResult,
        durationText,
        durationSeconds,
        flags,
      });
    }

    if (routeResult.routes[0].bounds) {
      bounds.union(routeResult.routes[0].bounds);
    }
  } else if (type === "walk") {
    applyWalkRouteFailure();
  } else {
    applyRailRouteFailure({ rejectReason, flags });
  }
}

/**
 * 完了数を更新する。
 * @param {any} flags 進捗フラグ。
 * @returns {boolean} 完了判定。
 */
function incrementRouteCompletion(flags) {
  flags.completed += 1;
  return flags.completed >= flags.expected;
}
