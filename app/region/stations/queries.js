/**
 * 駅候補の検索とフィルタをまとめる。
 * @file 駅候補の検索とフィルタをまとめる。
 */
/* exported isStationResult, isResultInRegion, extractStationLabel, stripRegionSuffix, getRegionLabel */
/* exported buildRegionStationQueries, resultHasStationKeyword, extractLocalityCandidates, resolveLocalityCandidates */
/* exported buildStartStationQueries */
/* global REGION_QUERY_EXCEPTIONS: writable, REGION_STATION_QUERIES: writable, STATION_TYPES: writable */
/* global extractRegionFromComponents: writable, geocoder: writable, normalizeRegionFilter: writable */
/**
 * 結果が駅に該当するか判定する。
 * @param {any} result 検索結果。
 * @returns {boolean} 駅判定。
 */
function isStationResult(result) {
  const types = result?.types;
  let isStation = false;
  if (Array.isArray(types)) {
    isStation = types.some((type) => STATION_TYPES.has(type));
  }
  return isStation;
}

/**
 * 結果が地域フィルタに一致するか判定する。
 * @param {any} result 検索結果。
 * @param {any} region 地域フィルタ。
 * @returns {boolean} 一致判定。
 */
function isResultInRegion(result, region) {
  const regionFilters = normalizeRegionFilter(region);
  let isMatch = true;
  if (regionFilters.length) {
    const regionName = extractRegionFromComponents(
      result?.address_components || []
    );
    if (
      regionName &&
      regionFilters.some((filter) => regionName.includes(filter))
    ) {
      isMatch = true;
    } else {
      const formatted = result?.formatted_address || "";
      isMatch = regionFilters.some((filter) => formatted.includes(filter));
    }
  }
  return isMatch;
}

/**
 * 結果から駅ラベルを抽出する。
 * @param {any} result 検索結果。
 * @returns {string} 駅ラベル。
 */
function extractStationLabel(result) {
  const components = result?.address_components || [];
  const labelComponent = components.find((/** @type {any} */ component) =>
    component.types?.some((/** @type {string} */ type) =>
      ["transit_station", "point_of_interest", "establishment", "premise"].includes(
        type
      )
    )
  );
  return labelComponent?.long_name || "";
}

/**
 * 地域名の接尾辞を除去する。
 * @param {string} region 地域名。
 * @returns {string} 整形済み地域名。
 */
function stripRegionSuffix(region) {
  let stripped = "";
  if (region) {
    const value = Array.isArray(region) ? region.find(Boolean) : region;
    if (typeof value === "string" && value) {
      stripped = value === "北海道" ? value : value.replace(/[都府県]$/, "");
    }
  }
  return stripped;
}

/**
 * 地域指定からラベル文字列を取得する。
 * @param {string} region 地域指定。
 * @returns {string} 地域ラベル。
 */
function getRegionLabel(region) {
  let label = "";
  if (region) {
    if (Array.isArray(region)) {
      label = region.find(Boolean) || "";
    } else if (typeof region === "string") {
      label = region;
    }
  }
  return label;
}

/**
 * 地域に基づく駅検索クエリを生成する。
 * @param {string} region 地域名。
 * @returns {string[]} 検索クエリ配列。
 */
function buildRegionStationQueries(region) {
  const trimmed = region.trim();
  /** @type {string[]} */
  let queries = [];
  if (trimmed) {
    const variants = [trimmed];
    const exception = REGION_QUERY_EXCEPTIONS[trimmed];
    if (exception) {
      variants.push(exception);
    }
    const stripped = stripRegionSuffix(trimmed);
    if (stripped && stripped !== trimmed) {
      variants.push(stripped);
    }
    /** @type {string[]} */
    const expanded = [];
    variants.forEach((variant) => {
      REGION_STATION_QUERIES.forEach((suffix) => {
        expanded.push(`${variant} ${suffix}`);
        expanded.push(`${variant}${suffix}`);
      });
    });
    queries = [...new Set(expanded)];
  }
  return queries;
}

/**
 * 結果に駅キーワードが含まれるか判定する。
 * @param {any} result 検索結果。
 * @returns {boolean} 駅キーワード判定。
 */
function resultHasStationKeyword(result) {
  const label = extractStationLabel(result);
  let hasKeyword = false;
  if (label && label.includes("駅")) {
    hasKeyword = true;
  } else if (result?.formatted_address?.includes("駅")) {
    hasKeyword = true;
  } else {
    const components = result?.address_components || [];
    hasKeyword = components.some(
      (/** @type {any} */ component) => component.long_name?.includes("駅")
    );
  }
  return hasKeyword;
}

/**
 * 住所コンポーネントから地名候補を抽出する。
 * @param {any} components 住所コンポーネント配列。
 * @returns {string[]} 地名候補配列。
 */
function extractLocalityCandidates(components) {
  /** @type {string[]} */
  let names = [];
  if (Array.isArray(components)) {
    const types = [
      "locality",
      "administrative_area_level_2",
      "sublocality_level_1",
      "sublocality_level_2",
    ];
    /** @type {string[]} */
    const collected = [];
    types.forEach((type) => {
      const name = components.find((/** @type {any} */ component) =>
        component.types?.includes(type)
      )?.long_name;
      if (name) {
        collected.push(name);
      }
    });
    names = [...new Set(collected)];
  }
  return names;
}

/**
 * 逆ジオコードで地名候補を取得する。
 * @param {any} latLng 座標。
 * @returns {Promise<string[]>} 地名候補配列のPromise。
 */
function resolveLocalityCandidates(latLng) {
  return new Promise((resolve) => {
    if (!geocoder || !latLng) {
      resolve([]);
      return;
    }
    geocoder.geocode(
      { location: latLng },
      (/** @type {any} */ results, /** @type {any} */ status) => {
      if (status !== "OK" || !results?.[0]) {
        resolve([]);
        return;
      }
      resolve(extractLocalityCandidates(results[0].address_components));
      }
    );
  });
}

/**
 * 出発地周辺の駅検索クエリを生成する。
 * @returns {string[]} 検索クエリ配列。
 */
function buildStartStationQueries(
  /** @type {{ region?: any, stopName?: any, localities?: any }} */
  { region, stopName, localities }
) {
  /** @type {Set<string>} */
  const queries = new Set();
  const addStationQuery = (/** @type {string} */ value) => {
    if (!value) {
      return;
    }
    queries.add(`${value} 駅`);
    queries.add(`${value}駅`);
  };
  if (stopName) {
    addStationQuery(stopName);
    queries.add(`${stopName} 最寄り駅`);
  }
  /** @type {string[]} */
  const localityList = Array.isArray(localities) ? localities : [];
  localityList.forEach(addStationQuery);
  const regionLabel = getRegionLabel(region);
  if (regionLabel) {
    addStationQuery(regionLabel);
    const stripped = stripRegionSuffix(regionLabel);
    if (stripped && stripped !== regionLabel) {
      addStationQuery(stripped);
    }
    localityList.slice(0, 2).forEach((locality) => {
      addStationQuery(`${regionLabel} ${locality}`);
      if (stripped) {
        addStationQuery(`${stripped} ${locality}`);
      }
    });
  }
  return [...queries];
}