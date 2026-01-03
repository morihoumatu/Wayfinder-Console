/**
 * おすすめ検索UIの操作をまとめる。
 * @file おすすめ検索UIの操作をまとめる。
 */
/* exported getMaxMinutes, getTargetMinutes, updateLimitHint, setRecommendHint, setRecommendLoading */
/* exported clearRecommendResult, renderStops, renderSources */
/* global DEFAULT_WALK_TARGET_MINUTES: writable, buildMapsLink: writable, limitHint: writable, maxTimeInput: writable */
/* global recommendAddress: writable, recommendButton: writable, recommendButtonLabel: writable */
/* global recommendHint: writable, recommendMapLink: writable, recommendQuery: writable, recommendReason: writable */
/* global recommendResult: writable, recommendSources: writable, recommendStops: writable */
/* global recommendStopsSection: writable, recommendTitle: writable */
/**
 * 所要時間の上限を取得する。
 * @returns {number | null} 上限分数またはnull。
 */
function getMaxMinutes() {
  // valueを解析する。
  const value = Number.parseInt(maxTimeInput.value, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * 目標所要時間を取得する。
 * @returns {number} 目標分数。
 */
function getTargetMinutes() {
  return getMaxMinutes() || DEFAULT_WALK_TARGET_MINUTES;
}

/**
 * 所要時間上限のヒントを更新する。
 */
function updateLimitHint() {
  // maxMinutesを取得する。
  const maxMinutes = getMaxMinutes();
  limitHint.textContent = maxMinutes
    ? `所要時間の上限は${maxMinutes}分です。`
    : `未入力なら制限なし（空欄検索は${DEFAULT_WALK_TARGET_MINUTES}分目安）`;
}

/**
 * おすすめヒントを更新する。
 * @param {string} message ヒント文。
 */
function setRecommendHint(message) {
  recommendHint.textContent = message;
}

/**
 * おすすめ検索のローディング状態を切り替える。
 * @param {boolean} loading ローディングフラグ。
 */
function setRecommendLoading(loading) {
  recommendButton.disabled = loading;
  recommendQuery.disabled = loading;
  recommendButton.textContent = loading
    ? "検索中..."
    : recommendButtonLabel;
}

/**
 * おすすめ表示を初期化する。
 */
function clearRecommendResult() {
  recommendTitle.textContent = "-";
  recommendAddress.textContent = "-";
  recommendReason.textContent = "-";
  recommendMapLink.href = "#";
  recommendMapLink.hidden = true;
  recommendStops.textContent = "";
  recommendStopsSection.hidden = true;
  recommendSources.textContent = "";
  recommendResult.hidden = true;
}

/**
 * おすすめ地点の立ち寄りを描画する。
 * @param {any} stops 立ち寄りリスト。
 */
function renderStops(stops) {
  recommendStops.textContent = "";
  if (!Array.isArray(stops) || stops.length === 0) {
    recommendStopsSection.hidden = true;
    return;
  }
  stops.forEach((stop) => {
    // DOM要素を生成する。
    const item = document.createElement("li");
    if (typeof stop === "string") {
      // DOM要素を生成する。
      const link = document.createElement("a");
      link.href = buildMapsLink(stop);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.className = "map-link";
      link.textContent = stop;
      item.appendChild(link);
    } else if (stop && typeof stop === "object") {
      // nameを条件で選ぶ。
      const name = stop.name || stop.title || "";
      // addressを条件で選ぶ。
      const address = stop.address || "";
      // labelを取得する。
      const label = [name, address].filter(Boolean).join(" ");
      // DOM要素を生成する。
      const link = document.createElement("a");
      link.href = buildMapsLink(label);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.className = "map-link";
      link.textContent = label || "不明";
      item.appendChild(link);
    } else {
      item.textContent = "不明";
    }
    recommendStops.appendChild(item);
  });
  recommendStopsSection.hidden = false;
}

/**
 * おすすめの参照元を描画する。
 * @param {any} sources 参照元リスト。
 */
function renderSources(sources) {
  recommendSources.textContent = "";
  if (!Array.isArray(sources) || sources.length === 0) {
    // DOM要素を生成する。
    const item = document.createElement("li");
    item.textContent = "参照なし";
    recommendSources.appendChild(item);
    return;
  }

  sources.forEach((source) => {
    // DOM要素を生成する。
    const item = document.createElement("li");
    // DOM要素を生成する。
    const link = document.createElement("a");
    // URLを条件で選ぶ。
    const url = typeof source === "string" ? source : source.url;
    // titleを条件で選ぶ。
    const title =
      typeof source === "string" ? source : source.title || source.url;
    if (!url) {
      item.textContent = title || "参照なし";
      recommendSources.appendChild(item);
      return;
    }
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = title || url;
    item.appendChild(link);
    recommendSources.appendChild(item);
  });
}