/**
 * 駅名検索のジオコード処理をまとめる。
 * @file 駅名検索のジオコード処理をまとめる。
 */
/* exported geocodeByAddress, filterStationResults, selectStationResult, findStationInRegion */
/* exported getStationNameFromResult, resolveRegionAnchor, findNearestStationToLocation */
/* global MAX_STATION_QUERIES: writable, buildRegionStationQueries: writable, buildStartStationQueries: writable */
/* global computeDistanceMeters: writable, extractStationLabel: writable, geocodeAddress: writable */
/* global geocoder: writable, getLatLngLiteral: writable, isResultInRegion: writable, isStationResult: writable */
/* global normalizeRegionFilter: writable, resolveLocalityCandidates: writable, resultHasStationKeyword: writable */
/**
 * 住所文字列をジオコードする。
 * @param {string} address 住所文字列。
 * @returns {Promise<any[]>} ジオコード結果のPromise。
 */
function geocodeByAddress(address) {
  return new Promise((resolve) => {
    if (!geocoder || !address) {
      resolve([]);
      return;
    }
    geocoder.geocode(
      { address },
      (/** @type {any} */ results, /** @type {any} */ status) => {
      if (status === "OK" && Array.isArray(results)) {
        resolve(results);
        return;
      }
      resolve([]);
      }
    );
  });
}

/**
 * 検索結果を駅候補に絞り込む。
 * @param {any} results 検索結果配列。
 * @param {any} region 地域フィルタ。
 * @returns {any[]} 駅候補配列。
 */
function filterStationResults(results, region) {
  // 一覧を条件で選ぶ。
  const list = Array.isArray(results) ? results : [];
  // filteredの一覧を用意する。
  let filtered = [];
  if (list.length) {
    // 判定結果を用意する。
    const hasRegionFilter = normalizeRegionFilter(region).length > 0;
    // 結果を取得する。
    const stationResults = list.filter(isStationResult);
    // regionStationsを取得する。
    const regionStations = stationResults.filter((result) =>
      isResultInRegion(result, region)
    );
    if (regionStations.length) {
      filtered = regionStations;
    } else if (!hasRegionFilter && stationResults.length) {
      filtered = stationResults;
    } else {
      // 結果を取得する。
      const keywordResults = list.filter(resultHasStationKeyword);
      // キーを取得する。
      const regionKeywords = keywordResults.filter((result) =>
        isResultInRegion(result, region)
      );
      if (regionKeywords.length) {
        filtered = regionKeywords;
      } else {
        filtered = hasRegionFilter ? [] : keywordResults;
      }
    }
  }
  return filtered;
}

/**
 * 地域条件に合う駅候補を選ぶ。
 * @param {any} results 検索結果配列。
 * @param {any} region 地域フィルタ。
 * @returns {any} 選択された駅候補。
 */
function selectStationResult(results, region) {
  // filteredを取得する。
  const filtered = filterStationResults(results, region);
  return filtered[0] || null;
}

/**
 * 地域内の駅候補を探す。
 * @param {string} region 地域名。
 * @returns {Promise<any>} 駅候補のPromise。
 */
async function findStationInRegion(region) {
  // stationの初期値を定義する。
  let station = null;
  if (geocoder && region) {
    // queriesを作成する。
    const queries = buildRegionStationQueries(region);
    // queryをループ用に用意する。
    for (const query of queries) {
      // 結果を取得する。
      const results = await geocodeByAddress(query);
      // selectedを取得する。
      const selected = selectStationResult(results, region);
      if (selected?.geometry?.location) {
        station = {
          location: selected.geometry.location,
          name: extractStationLabel(selected),
          address: selected.formatted_address || "",
        };
        break;
      }
    }
  }
  return station;
}

/**
 * 結果から駅名を取得する。
 * @param {any} result 検索結果。
 * @returns {string} 駅名。
 */
function getStationNameFromResult(result) {
  // nameの初期値を定義する。
  let name = "";
  if (result) {
    name =
      result.name ||
      extractStationLabel(result) ||
      result.formatted_address ||
      "";
  }
  return name;
}

/**
 * 地域名をアンカー座標に解決する。
 * @param {string} region 地域名。
 * @returns {Promise<any>} 座標のPromise。
 */
async function resolveRegionAnchor(region) {
  // locationの初期値を定義する。
  let location = null;
  if (region) {
    try {
      location = await geocodeAddress(region);
    } catch (error) {
      location = null;
    }
  }
  return location;
}

/**
 * 指定地点から最寄り駅候補を探す。
 * @param {{ startLocation?: any, stopName?: any, region?: any }} options 検索オプション。
 * @returns {Promise<any | null>} 駅候補またはnullのPromise。
 */
async function findNearestStationToLocation(
  /** @type {{ startLocation?: any, stopName?: any, region?: any }} */
  { startLocation, stopName, region }
) {
  // stationの初期値を定義する。
  let station = null;
  if (geocoder && startLocation) {
    // localitiesを解決する。
    const localities = await resolveLocalityCandidates(startLocation);
    // queriesを取得する。
    const queries = buildStartStationQueries({
      region,
      stopName,
      localities,
    }).slice(0, MAX_STATION_QUERIES);
    // startLiteralを取得する。
    const startLiteral = getLatLngLiteral(startLocation);
    if (queries.length && startLiteral) {
      /** @type {Array<{ result: any, distance: number }>} */
      const candidates = [];
      // queryをループ用に用意する。
      for (const query of queries) {
        // 結果を取得する。
        const results = await geocodeByAddress(query);
        // filteredを取得する。
        const filtered = filterStationResults(results, region);
        filtered.forEach((result) => {
          // locationLiteralを取得する。
          const locationLiteral = getLatLngLiteral(result?.geometry?.location);
          // distanceを条件で選ぶ。
          const distance =
            locationLiteral &&
            computeDistanceMeters(startLiteral, locationLiteral);
          if (locationLiteral && distance !== null) {
            candidates.push({ result, distance });
          }
        });
      }

      if (candidates.length) {
        candidates.sort((a, b) => a.distance - b.distance);
        // bestの参照を保持する。
        const best = candidates[0];
        if (best) {
          station = {
            location: best.result?.geometry?.location || null,
            name: getStationNameFromResult(best.result),
            address: best.result?.formatted_address || "",
          };
        }
      }
    }
  }
  return station;
}