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
  const list = Array.isArray(results) ? results : [];
  let filtered = [];
  if (list.length) {
    const hasRegionFilter = normalizeRegionFilter(region).length > 0;
    const stationResults = list.filter(isStationResult);
    const regionStations = stationResults.filter((result) =>
      isResultInRegion(result, region)
    );
    if (regionStations.length) {
      filtered = regionStations;
    } else if (!hasRegionFilter && stationResults.length) {
      filtered = stationResults;
    } else {
      const keywordResults = list.filter(resultHasStationKeyword);
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
  const filtered = filterStationResults(results, region);
  return filtered[0] || null;
}

/**
 * 地域内の駅候補を探す。
 * @param {string} region 地域名。
 * @returns {Promise<any>} 駅候補のPromise。
 */
async function findStationInRegion(region) {
  let station = null;
  if (geocoder && region) {
    const queries = buildRegionStationQueries(region);
    for (const query of queries) {
      const results = await geocodeByAddress(query);
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
  let station = null;
  if (geocoder && startLocation) {
    const localities = await resolveLocalityCandidates(startLocation);
    const queries = buildStartStationQueries({
      region,
      stopName,
      localities,
    }).slice(0, MAX_STATION_QUERIES);
    const startLiteral = getLatLngLiteral(startLocation);
    if (queries.length && startLiteral) {
      /** @type {Array<{ result: any, distance: number }>} */
      const candidates = [];
      for (const query of queries) {
        const results = await geocodeByAddress(query);
        const filtered = filterStationResults(results, region);
        filtered.forEach((result) => {
          const locationLiteral = getLatLngLiteral(result?.geometry?.location);
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