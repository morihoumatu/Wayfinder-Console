/**
 * 立ち寄り候補の抽出処理をまとめる。
 * @file 立ち寄り候補の抽出処理をまとめる。
 */
/**
 * 立ち寄り候補として扱えるか判定する。
 * @param {any} entry 候補データ。
 * @returns {boolean} 判定結果。
 */
function isStopLike(entry) {
  let isLike = false;
  if (entry && typeof entry === "object") {
    isLike =
      typeof entry.name === "string" ||
      typeof entry.address === "string" ||
      typeof entry.title === "string";
  }
  return isLike;
}

/**
 * 立ち寄り行から記号を除去する。
 * @param {string} line 入力行。
 * @returns {string} 整形済み行。
 */
function cleanStopLine(line) {
  let cleaned = "";
  if (line) {
    cleaned = line.replace(/^[\s*・\-–—•\d+.、)]+/, "").trim();
  }
  return cleaned;
}

/**
 * 文字列から立ち寄り情報を解析する。
 * @param {string} value 入力文字列。
 * @returns {Array<{ name: string, address: string }>} 立ち寄り配列。
 */
function parseStopString(value) {
  const trimmed = value.trim();
  /** @type {Array<{ name: string, address: string }>} */
  let stops = [];
  if (trimmed) {
    let parts = trimmed
      .split(/\r?\n/)
      .map(cleanStopLine)
      .filter(Boolean);
    if (parts.length < 2) {
      parts = trimmed
        .split(/[→>]/)
        .map(cleanStopLine)
        .filter(Boolean);
    }
    if (parts.length < 2) {
      parts = trimmed
        .split("・")
        .map(cleanStopLine)
        .filter(Boolean);
    }
    stops = parts
      .map((part) => {
        const segments = part.split(/\s+|、|,/);
        const name = segments[0] || "";
        const address = segments.slice(1).join(" ");
        return { name, address };
      })
      .filter((stop) => stop.name);
  }
  return stops;
}

/**
 * 立ち寄り配列を整形する。
 * @param {Array<{ name: string, address: string }>} stops 立ち寄り配列。
 * @returns {Array<{ name: string, address: string }>} 整形配列。
 */
function normalizeStops(stops) {
  return stops
    .map((stop) => ({
      name: typeof stop.name === "string" ? stop.name.trim() : "",
      address: typeof stop.address === "string" ? stop.address.trim() : "",
    }))
    .filter((stop) => stop.name);
}

/**
 * 立ち寄り候補かどうか判定する。
 * @param {any} entry 候補データ。
 * @returns {boolean} 判定結果。
 */
function isStopCandidate(entry) {
  return (
    isStopLike(entry) &&
    typeof entry.name === "string" &&
    typeof entry.address === "string"
  );
}

/**
 * 立ち寄り候補を収集する。
 * @param {any} stops 入力配列。
 * @returns {Array<{ name: string, address: string }>} 候補配列。
 */
function collectStopCandidates(stops) {
  /** @type {Array<{ name: string, address: string }>} */
  const candidates = [];
  if (Array.isArray(stops)) {
    stops.forEach((entry) => {
      if (isStopCandidate(entry)) {
        candidates.push({ name: entry.name, address: entry.address });
      }
    });
  }
  return candidates;
}

/**
 * 候補の先頭から必要数を選択する。
 * @param {Array<{ name: string, address: string }>} candidates 候補配列。
 * @returns {Array<{ name: string, address: string }>} 選択結果。
 */
function selectStopsFromCandidates(candidates) {
  return candidates.slice(0, 8);
}

/**
 * OpenAI結果から立ち寄り配列を抽出する。
 * @param {any} result OpenAI結果。
 * @returns {Array<{ name: string, address: string }>} 立ち寄り配列。
 */
function extractStopsFromResult(result) {
  const stopValue = result?.stops ?? result?.points ?? result?.places;
  /** @type {Array<{ name: string, address: string }>} */
  let stops = [];
  if (Array.isArray(stopValue)) {
    stops = collectStopCandidates(stopValue);
  } else if (typeof stopValue === "string") {
    stops = parseStopString(stopValue);
  }
  return normalizeStops(stops);
}

module.exports = {
  isStopLike,
  cleanStopLine,
  parseStopString,
  normalizeStops,
  isStopCandidate,
  collectStopCandidates,
  selectStopsFromCandidates,
  extractStopsFromResult,
};
