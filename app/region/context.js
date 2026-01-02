/**
 * 地域選択の状態と判定をまとめる。
 * @file 地域選択の状態と判定をまとめる。
 */
/* exported extractRegionFromComponents, normalizeRegionFilter, isRegionMatch, resolveIsOriginInRegion */
/* exported pickRandomItem, getAreaAnchor, getSelectedRegionContext, formatRegionForPrompt, resolveOriginRegion */
/* global REGION_GROUPS: writable, areaAnchorCache: writable, areaAnchorSelection: writable, geocoder: writable */
/* global originAreaSelect: writable, originRegion: writable, originRegionSelect: writable */
/**
 * 住所コンポーネントから地域名を抽出する。
 * @param {any} components 住所コンポーネント配列。
 * @returns {string | null} 地域名またはnull。
 */
function extractRegionFromComponents(components) {
  let region = null;
  if (Array.isArray(components)) {
    const findPart = (/** @type {string} */ type) =>
      components.find((/** @type {any} */ component) =>
        component.types?.includes(type)
      )?.long_name;
    const prefecture = findPart("administrative_area_level_1");
    const locality = findPart("locality") || findPart("sublocality_level_1");
    const sublocality = findPart("sublocality_level_2");
    const parts = [prefecture, locality, sublocality].filter(Boolean);
    region = parts.length ? parts.join("") : null;
  }
  return region;
}

/**
 * 地域フィルタを配列に正規化する。
 * @param {any} region 地域指定。
 * @returns {string[]} フィルタ配列。
 */
function normalizeRegionFilter(region) {
  let filters = [];
  if (region) {
    if (Array.isArray(region)) {
      filters = region.filter(Boolean);
    } else if (typeof region === "string") {
      filters = region
        .split(/[、,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return filters;
}

/**
 * 地域名がフィルタに一致するか判定する。
 * @param {string} regionName 地域名。
 * @param {any} context 判定用コンテキスト。
 * @returns {boolean} 一致判定。
 */
function isRegionMatch(regionName, context) {
  let isMatch = true;
  if (regionName && context) {
    const filters = normalizeRegionFilter(
      Array.isArray(context.prefectures) && context.prefectures.length > 0
        ? context.prefectures
        : context.label
    );
    if (filters.length) {
      isMatch = filters.some((filter) => regionName.includes(filter));
    }
  }
  return isMatch;
}

/**
 * 出発地が地域条件に合うか判定する。
 * @param {any} latLng 出発地座標。
 * @param {any} context 判定用コンテキスト。
 * @returns {Promise<boolean>} 一致判定のPromise。
 */
async function resolveIsOriginInRegion(latLng, context) {
  let isMatch = true;
  if (latLng && context) {
    const regionName = await resolveOriginRegion(latLng);
    if (regionName) {
      isMatch = isRegionMatch(regionName, context);
    } else if (originRegion) {
      isMatch = isRegionMatch(originRegion, context);
    } else {
      isMatch = false;
    }
  }
  return isMatch;
}

/**
 * 配列からランダムに1件選ぶ。
 * @param {any[]} list 候補配列。
 * @returns {string} 選択された文字列。
 */
function pickRandomItem(list) {
  let picked = "";
  if (Array.isArray(list) && list.length > 0) {
    const index = Math.floor(Math.random() * list.length);
    picked = list[index];
  }
  return picked;
}

/**
 * 選択エリアのアンカー文字列を決定する。
 * @param {string} areaValue エリア名。
 * @param {boolean} refreshAnchor アンカー再生成フラグ。
 * @returns {string} アンカー文字列。
 */
function getAreaAnchor(areaValue, refreshAnchor) {
  let anchor = "";
  if (areaValue && REGION_GROUPS[areaValue]) {
    const group = REGION_GROUPS[areaValue];
    if (areaValue !== areaAnchorSelection || refreshAnchor) {
      if (areaValue === "関東地方") {
        areaAnchorCache = pickRandomItem(group.prefectures) || group.anchor;
      } else {
        areaAnchorCache = group.anchor;
      }
      areaAnchorSelection = areaValue;
    }
    anchor = areaAnchorCache;
  }
  return anchor;
}

/**
 * 選択UIから地域コンテキストを取得する。
 * @param {{ refreshAnchor?: boolean }} [options] 取得オプション。
 * @returns {any} 地域コンテキスト。
 */
function getSelectedRegionContext(options = {}) {
  const refreshAnchor = Boolean(options.refreshAnchor);
  const areaValue = originAreaSelect?.value?.trim();
  let context = null;
  if (areaValue && REGION_GROUPS[areaValue]) {
    const group = REGION_GROUPS[areaValue];
    context = {
      label: areaValue,
      prefectures: group.prefectures,
      anchor: getAreaAnchor(areaValue, refreshAnchor),
    };
  } else {
    const prefValue = originRegionSelect?.value?.trim();
    if (prefValue) {
      context = {
        label: prefValue,
        prefectures: [prefValue],
        anchor: prefValue,
      };
    }
  }
  return context;
}

/**
 * プロンプト用に地域ラベルを整形する。
 * @param {any} context 地域コンテキスト。
 * @returns {string} 地域ラベル。
 */
function formatRegionForPrompt(context) {
  return context ? context.label : "";
}

/**
 * 逆ジオコードで出発地の地域名を取得する。
 * @param {any} latLng 出発地座標。
 * @returns {Promise<string | null>} 地域名またはnullのPromise。
 */
function resolveOriginRegion(latLng) {
  return new Promise((resolve) => {
    if (!geocoder || !latLng) {
      resolve(null);
      return;
    }
    geocoder.geocode(
      { location: latLng },
      (/** @type {any} */ results, /** @type {any} */ status) => {
      if (status !== "OK" || !results?.[0]) {
        resolve(null);
        return;
      }
      const region =
        extractRegionFromComponents(results[0].address_components) ||
        results[0].formatted_address ||
        null;
      resolve(region);
      }
    );
  });
}