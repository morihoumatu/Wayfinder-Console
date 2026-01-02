const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number.parseInt(process.env["PORT"] || "3000", 10);
const ROOT = __dirname;
const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];
const OPENAI_API_URL =
  process.env["OPENAI_API_URL"] || "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env["OPENAI_MODEL"] || "gpt-4o-mini";
const WEB_SEARCH_TOOL =
  process.env["OPENAI_WEB_SEARCH_TOOL"] === undefined
    ? "web_search"
    : process.env["OPENAI_WEB_SEARCH_TOOL"];
const DEFAULT_WALK_TARGET_MINUTES = 60;

/** @type {Record<string, string>} */
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

/**
 * ベースパスとターゲットを安全に結合する。
 * @param {string} base 基準パス。
 * @param {string} target 対象パス。
 * @returns {string | null} 安全なパスまたはnull。
 */
function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  const resolved = targetPath.startsWith(base) ? targetPath : null;
  return resolved;
}

/**
 * JSONレスポンスを送信する。
 * @param {import("http").ServerResponse} res レスポンスオブジェクト。
 * @param {number} status HTTPステータス。
 * @param {unknown} payload レスポンス本文。
 */
function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

/**
 * リクエスト本文のJSONを読み取る。
 * @param {import("http").IncomingMessage} req リクエスト。
 * @returns {Promise<any>} 解析結果のPromise。
 */
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on(
      "data",
      (/** @type {Buffer | string} */ chunk) => {
        body += chunk;
        if (body.length > 1_000_000) {
          reject(new Error("Request body too large."));
          req.destroy();
        }
      }
    );
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON."));
      }
    });
  });
}

/**
 * OpenAIレスポンスからテキストを抽出する。
 * @param {any} response APIレスポンス。
 * @returns {string} 抽出テキスト。
 */
function extractOutputText(response) {
  let outputText = "";
  if (typeof response.output_text === "string") {
    outputText = response.output_text;
  } else if (Array.isArray(response.output)) {
    /** @type {string[]} */
    const textChunks = [];
    response.output.forEach((/** @type {any} */ item) => {
      if (!Array.isArray(item.content)) {
        return;
      }
      item.content.forEach((/** @type {any} */ content) => {
        if (
          (content.type === "output_text" || content.type === "text") &&
          content.text
        ) {
          textChunks.push(content.text);
        }
      });
    });
    outputText = textChunks.join("\n").trim();
  }
  return outputText;
}

/**
 * テキストからJSONを抽出して解析する。
 * @param {string} text 入力テキスト。
 * @returns {any} 解析結果。
 */
function parseJsonFromText(text) {
  let parsed = null;
  if (text) {
    const trimmed = text.trim();
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      // Try fenced JSON blocks first.
      const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fencedMatch && typeof fencedMatch[1] === "string") {
        try {
          parsed = JSON.parse(fencedMatch[1].trim());
        } catch (innerError) {
          parsed = null;
        }
      }
      if (parsed === null) {
        parsed = findJsonInText(trimmed);
      }
    }
  }
  return parsed;
}

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
    stops = parts.map((/** @type {string} */ part) => ({
      name: part,
      address: "",
    }));
  }
  return stops;
}

/**
 * 立ち寄りデータを配列に正規化する。
 * @param {any} rawStops 元データ。
 * @returns {any[]} 正規化配列。
 */
function normalizeStops(rawStops) {
  let normalized = [];
  if (rawStops) {
    if (Array.isArray(rawStops)) {
      normalized = rawStops.filter(Boolean);
    } else if (typeof rawStops === "string") {
      normalized = parseStopString(rawStops);
    } else if (isStopLike(rawStops)) {
      normalized = [rawStops];
    } else if (typeof rawStops === "object") {
      normalized = Object.values(rawStops).filter(
        (entry) => entry && (typeof entry === "string" || isStopLike(entry))
      );
    }
  }
  return normalized;
}

/**
 * 立ち寄り候補かどうか判定する。
 * @param {any} value 候補値。
 * @returns {boolean} 判定結果。
 */
function isStopCandidate(value) {
  return Array.isArray(value) || typeof value === "string" || isStopLike(value);
}

/**
 * 候補リストから立ち寄り候補を抽出する。
 * @param {any} result 結果データ。
 * @returns {any[]} 候補配列。
 */
function collectStopCandidates(result) {
  const candidates = [
    result.stops,
    result.stop_list,
    result.route_stops,
    result.waypoints,
    result.places,
    result.points,
    result.route?.stops,
    result.route?.waypoints,
    result.route?.places,
    result.route?.points,
  ];
  if (result.route && isStopCandidate(result.route)) {
    candidates.push(result.route);
  }
  if (result.itinerary && isStopCandidate(result.itinerary)) {
    candidates.push(result.itinerary);
  }
  return candidates;
}

/**
 * 候補配列から立ち寄りを選択する。
 * @param {any[]} candidates 候補配列。
 * @returns {any[]} 立ち寄り配列。
 */
function selectStopsFromCandidates(candidates) {
  let stops = [];
  for (const candidate of candidates) {
    const normalized = normalizeStops(candidate);
    if (normalized.length) {
      stops = normalized;
      break;
    }
  }
  return stops;
}

/**
 * 結果オブジェクトから立ち寄り情報を抽出する。
 * @param {any} result 結果データ。
 * @returns {any[]} 立ち寄り配列。
 */
function extractStopsFromResult(result) {
  let stops = [];
  if (result) {
    if (Array.isArray(result)) {
      stops = normalizeStops(result);
    } else {
      const candidates = collectStopCandidates(result);
      stops = selectStopsFromCandidates(candidates);
    }
  }
  return stops;
}

/**
 * テキスト内のJSONを探索する。
 * @param {string} text 入力テキスト。
 * @returns {any} 抽出したJSON。
 */
function findJsonInText(text) {
  let parsed = null;
  let parsedOk = false;
  if (text) {
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch !== "{" && ch !== "[") {
        continue;
      }
      const endIndex = findMatchingBracket(text, i);
      if (endIndex === -1) {
        continue;
      }
      const snippet = text.slice(i, endIndex + 1);
      try {
        parsed = JSON.parse(snippet);
        parsedOk = true;
        break;
      } catch (error) {
        continue;
      }
    }
  }
  return parsedOk ? parsed : null;
}

/**
 * 文字列内のエスケープ判定を行う。
 * @param {string} text 対象テキスト。
 * @param {number} index 判定位置。
 * @returns {boolean} 判定結果。
 */
function isEscapedChar(text, index) {
  return text[index] === "\\" && index + 1 < text.length;
}

/**
 * 対応する閉じ括弧の位置を探す。
 * @param {string} text 検索対象テキスト。
 * @param {number} startIndex 開始位置。
 * @returns {number} 閉じ括弧位置。
 */
function findMatchingBracket(text, startIndex) {
  const openChar = text[startIndex];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let matchIndex = -1;
  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (isEscapedChar(text, i)) {
        i += 1;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        matchIndex = i;
        break;
      }
    }
  }
  return matchIndex;
}

/**
 * 地域名から都道府県を抽出する。
 * @param {string} region 地域名。
 * @returns {string} 都道府県名。
 */
function extractPrefecture(region) {
  let extracted = "";
  if (region) {
    const match = region.match(/^(.+?[都道府県])/);
    extracted =
      match && typeof match[1] === "string" ? match[1] : region;
  }
  return extracted;
}

/**
 * OpenAI APIを呼び出す。
 * @param {any} payload リクエストペイロード。
 * @returns {Promise<any>} APIレスポンスのPromise。
 */
function callOpenAI(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(OPENAI_API_URL);
    const data = JSON.stringify(payload);
    const options = {
      method: "POST",
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const request = https.request(
      options,
      (/** @type {import("http").IncomingMessage} */ response) => {
        let body = "";
        response.on(
          "data",
          (/** @type {Buffer | string} */ chunk) => {
            body += chunk;
          }
        );
        response.on("end", () => {
          let parsed;
          let shouldResolve = true;
          try {
            parsed = JSON.parse(body);
          } catch (error) {
            reject(new Error("OpenAI response parse error."));
            shouldResolve = false;
          }
          if (shouldResolve && response.statusCode && response.statusCode >= 400) {
            const message =
              parsed?.error?.message || "OpenAI API request failed.";
            reject(new Error(message));
            shouldResolve = false;
          }
          if (shouldResolve) {
            resolve(parsed);
          }
        });
      }
    );

    request.on("error", () => {
      reject(new Error("OpenAI API connection failed."));
    });

    request.write(data);
    request.end();
  });
}

/**
 * 文字列を正規化する。
 * @param {any} value 入力値。
 * @returns {string} 正規化文字列。
 */
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 調整指示を正規化する。
 * @param {any} value 入力値。
 * @returns {string} 調整指示。
 */
function normalizeAdjustment(value) {
  return value === "longer" || value === "shorter" ? value : "";
}

/**
 * 文字列配列を正規化する。
 * @param {any} value 入力値。
 * @returns {string[]} 正規化配列。
 */
function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.filter((/** @type {string} */ entry) => typeof entry === "string")
    : [];
}

/**
 * おすすめAPI入力を解析する。
 * @param {any} payload 入力データ。
 * @returns {any} 解析結果。
 */
function parseRecommendPayload(payload) {
  return {
    query: normalizeText(payload?.query),
    mode: payload?.mode === "walk_route" ? "walk_route" : "spot",
    origin: payload?.origin,
    maxMinutes: Number.parseInt(payload?.maxMinutes, 10),
    targetMinutes: Number.parseInt(payload?.targetMinutes, 10),
    adjustment: normalizeAdjustment(payload?.adjustment),
    actualMinutes: Number.parseInt(payload?.actualMinutes, 10),
    originRegion: normalizeText(payload?.originRegion),
    originLabel: normalizeText(payload?.originLabel),
    originAreaLabel: normalizeText(payload?.originAreaLabel),
    originPrefectures: normalizeStringArray(payload?.originPrefectures),
  };
}

/**
 * おすすめAPI入力を検証する。
 * @param {any} context 解析結果。
 * @param {any} sendOnce 応答関数。
 * @returns {boolean} 検証結果。
 */
function validateRecommendRequest(context, sendOnce) {
  let isValid = true;
  if (!context.query && context.mode !== "walk_route") {
    sendOnce(400, { error: "検索キーワードが空です。" });
    isValid = false;
  }
  if (isValid) {
    const origin = context.origin;
    if (!origin || typeof origin.lat !== "number" || typeof origin.lng !== "number") {
      sendOnce(400, { error: "出発地の座標が不正です。" });
      isValid = false;
    }
  }
  return isValid;
}

/**
 * 目標所要時間の基準を決定する。
 * @param {number} maxMinutes 上限分数。
 * @param {number} targetMinutes 目標分数。
 * @returns {any} 算出結果。
 */
function resolveEffectiveTargetMinutes(maxMinutes, targetMinutes) {
  const hasMaxMinutes = Number.isFinite(maxMinutes) && maxMinutes > 0;
  const hasTargetMinutes = Number.isFinite(targetMinutes) && targetMinutes > 0;
  const effectiveTargetMinutes = hasTargetMinutes
    ? targetMinutes
    : hasMaxMinutes
      ? maxMinutes
      : DEFAULT_WALK_TARGET_MINUTES;
  return { hasMaxMinutes, hasTargetMinutes, effectiveTargetMinutes };
}

/**
 * 散歩ルートの区間レンジを算出する。
 * @param {number} effectiveTargetMinutes 目標分数。
 * @returns {any} 算出結果。
 */
function buildSegmentRange(effectiveTargetMinutes) {
  const desiredStops = Math.min(
    6,
    Math.max(3, Math.round(effectiveTargetMinutes / 45) + 2)
  );
  const segmentMinutes = Math.max(
    15,
    Math.round(effectiveTargetMinutes / (desiredStops + 1))
  );
  const segmentRange = `${Math.max(
    10,
    Math.round(segmentMinutes * 0.7)
  )}〜${Math.round(segmentMinutes * 1.3)}`;
  return { desiredStops, segmentRange };
}

/**
 * 散歩ルートの距離レンジを算出する。
 * @param {number | null} estimatedDistanceKm 推定距離。
 * @param {string} adjustment 調整指示。
 * @returns {any} 距離レンジ。
 */
function buildDistanceRange(estimatedDistanceKm, adjustment) {
  let distanceMinKm = estimatedDistanceKm
    ? Math.max(1, Math.round(estimatedDistanceKm * 0.8 * 10) / 10)
    : null;
  let distanceMaxKm = estimatedDistanceKm
    ? Math.round(estimatedDistanceKm * 1.2 * 10) / 10
    : null;
  if (estimatedDistanceKm && adjustment === "longer") {
    distanceMinKm = Math.max(1, Math.round(estimatedDistanceKm * 1.1 * 10) / 10);
    distanceMaxKm = Math.round(estimatedDistanceKm * 1.4 * 10) / 10;
  } else if (estimatedDistanceKm && adjustment === "shorter") {
    distanceMinKm = Math.max(1, Math.round(estimatedDistanceKm * 0.6 * 10) / 10);
    distanceMaxKm = Math.round(estimatedDistanceKm * 0.9 * 10) / 10;
  }
  return { distanceMinKm, distanceMaxKm };
}

/**
 * 散歩ルート向けの計算値を算出する。
 * @param {any} context 解析結果。
 * @returns {any} 計算結果。
 */
function buildWalkRouteMetrics(context) {
  const maxMinutes = context.maxMinutes;
  const targetMinutes = context.targetMinutes;
  const targetInfo = resolveEffectiveTargetMinutes(maxMinutes, targetMinutes);
  const adjustment = context.adjustment;
  const actualMinutes = context.actualMinutes;
  const hasActualMinutes = Number.isFinite(actualMinutes) && actualMinutes > 0;
  const estimatedDistanceKm = Number.isFinite(targetInfo.effectiveTargetMinutes)
    ? Math.round(targetInfo.effectiveTargetMinutes * 0.08 * 10) / 10
    : null;
  const segmentInfo = buildSegmentRange(targetInfo.effectiveTargetMinutes);
  const distanceRange = buildDistanceRange(estimatedDistanceKm, adjustment);
  return {
    maxMinutes,
    targetMinutes,
    hasMaxMinutes: targetInfo.hasMaxMinutes,
    hasTargetMinutes: targetInfo.hasTargetMinutes,
    effectiveTargetMinutes: targetInfo.effectiveTargetMinutes,
    adjustment,
    actualMinutes,
    hasActualMinutes,
    estimatedDistanceKm,
    desiredStops: segmentInfo.desiredStops,
    segmentRange: segmentInfo.segmentRange,
    distanceMinKm: distanceRange.distanceMinKm,
    distanceMaxKm: distanceRange.distanceMaxKm,
  };
}

/**
 * 都道府県リストを整形する。
 * @param {string[]} prefectures 都道府県リスト。
 * @returns {string[]} 整形済みリスト。
 */
function normalizePrefectureList(prefectures) {
  return prefectures.map((entry) => entry.trim()).filter(Boolean);
}

/**
 * 都道府県ヒントを作成する。
 * @param {string[]} prefectureList 都道府県リスト。
 * @returns {string} ヒント文字列。
 */
function buildPrefectureHint(prefectureList) {
  return prefectureList.length
    ? `対象都道府県: ${prefectureList.join("・")}`
    : "";
}

/**
 * 検索対象地域を決定する。
 * @param {string} originRegion 出発地の地域。
 * @param {boolean} isWalkRoute 散歩ルート判定。
 * @param {number} effectiveTargetMinutes 目標分数。
 * @returns {string} 検索地域。
 */
function buildSearchRegion(originRegion, isWalkRoute, effectiveTargetMinutes) {
  let searchRegion = originRegion;
  if (isWalkRoute && effectiveTargetMinutes >= 120) {
    searchRegion = extractPrefecture(originRegion) || originRegion;
  }
  return searchRegion;
}

/**
 * 距離の目安文言を生成する。
 * @param {number | null} distanceMinKm 最短距離。
 * @param {number | null} distanceMaxKm 最長距離。
 * @returns {string} 目安文言。
 */
function buildDistanceHint(distanceMinKm, distanceMaxKm) {
  return distanceMinKm && distanceMaxKm
    ? `総距離の目安: ${distanceMinKm}〜${distanceMaxKm}km`
    : "総距離の目安: 目標所要時間に合わせて調整";
}

/**
 * 散歩ルート用のシステムプロンプトを作成する。
 * @param {any} context プロンプト情報。
 * @returns {string} システムプロンプト。
 */
function buildWalkRouteSystemPrompt(context) {
  const distanceHint = buildDistanceHint(
    context.distanceMinKm,
    context.distanceMaxKm
  );
  return [
    "あなたは散歩ルートのプランナーです。",
    "必ずウェブ検索の結果に基づいて、出発地の近くで歩いて回れる散歩ルートを作成してください。",
    "座標は補助情報です。検索は出発地の地域名や地名を使って行い、座標から地名を推測しないでください。",
    "基本は徒歩で回ります。目標時間に足りない場合のみ在来線を組み合わせても構いません。",
    "新幹線などの高速鉄道は使わないでください。",
    "出発地の地域が提示されている場合は、その地域内または隣接エリアに限定してください。",
    "地域名と座標が矛盾していても、必ず地域名を優先してください。",
    "地域が合わない等の断り文句や確認依頼は出さず、必ず地域内の散歩ルートを提示してください。",
    "回答は必ずJSONのみ。文章や謝罪文は一切書かないでください。",
    "目標所要時間の前後になるように距離感を調整してください。",
    `立ち寄り地点は${context.desiredStops}件程度。各地点は徒歩${context.segmentRange}分程度の間隔で配置してください。`,
    distanceHint,
    "目標時間が長い場合は隣接エリアまで広げて良いです。",
    "前回より長め/短めの調整指示があれば必ず反映してください。",
    "各地点の住所はGoogle Mapsで特定できるように都道府県・市区町村まで含めてください。",
    "出力はJSONオブジェクトのみとし、余計な文章やコードフェンスは出さないでください。",
    "JSONの形式:",
    "{",
    '  "route_type": "walk_multi",',
    '  "route_name": "...",',
    '  "area": "...",',
    '  "reason": "...",',
    '  "target_minutes": 60,',
    '  "stops": [{"name": "...", "address": "..."}],',
    '  "source_urls": [{"title": "...", "url": "..."}],',
    '  "error": ""',
    "}",
    "取得できない場合は error に理由を入れてください。",
  ].join("\n");
}

/**
 * スポット用のシステムプロンプトを作成する。
 * @returns {string} システムプロンプト。
 */
function buildSpotSystemPrompt() {
  return [
    "あなたは旅行のリサーチャーです。",
    "必ずウェブ検索の結果に基づいて、出発地から近いおすすめの目的地を1件選んでください。",
    "所要時間の上限が指定されている場合、徒歩または在来線で上限以内の候補だけを選んでください。",
    "新幹線などの高速鉄道は除外してください。",
    "出発地の地域が提示されている場合は、その地域内または隣接エリアに限定してください。",
    "出力はJSONオブジェクトのみとし、余計な文章やコードフェンスは出さないでください。",
    "JSONの形式:",
    "{",
    '  "place_name": "...",',
    '  "place_address": "...",',
    '  "reason": "...",',
    '  "source_urls": [{"title": "...", "url": "..."}],',
    '  "error": ""',
    "}",
    "取得できない場合は error に理由を入れてください。",
  ].join("\n");
}

/**
 * 出発地の表示行を作成する。
 * @param {string} originLabel 出発地ラベル。
 * @param {any} origin 座標。
 * @returns {string} 表示行。
 */
function formatOriginLine(originLabel, origin) {
  return originLabel
    ? `出発地: ${originLabel} (座標: ${origin.lat}, ${origin.lng})`
    : `出発地: ${origin.lat}, ${origin.lng}`;
}

/**
 * 調整指示の表示文言を作成する。
 * @param {string} adjustment 調整指示。
 * @returns {string} 表示文言。
 */
function formatAdjustmentLabel(adjustment) {
  let label = "";
  if (adjustment === "longer") {
    label = "調整指示: 前回より長め";
  } else if (adjustment === "shorter") {
    label = "調整指示: 前回より短め";
  }
  return label;
}

/**
 * 散歩ルート用のユーザー入力を作成する。
 * @param {any} context プロンプト情報。
 * @returns {string} ユーザー入力。
 */
function buildWalkRouteUserContent(context) {
  const adjustmentLabel = formatAdjustmentLabel(context.adjustment);
  const lines = [
    formatOriginLine(context.originLabel, context.origin),
    context.searchRegion ? `出発地の地域: ${context.searchRegion}` : null,
    context.originAreaLabel ? `出発地の地方: ${context.originAreaLabel}` : null,
    context.prefectureHint || null,
    `テーマ: ${context.query || "散歩"}`,
    `目標所要時間: ${context.effectiveTargetMinutes}分前後`,
    context.estimatedDistanceKm
      ? `目安の総距離: 約${context.estimatedDistanceKm}km`
      : null,
    context.hasActualMinutes
      ? `前回のGoogle Maps実測: ${context.actualMinutes}分`
      : null,
    adjustmentLabel || null,
    "条件: 徒歩中心、必要なら在来線を組み合わせる",
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * スポット用のユーザー入力を作成する。
 * @param {any} context プロンプト情報。
 * @returns {string} ユーザー入力。
 */
function buildSpotUserContent(context) {
  const lines = [
    `出発地: ${context.origin.lat}, ${context.origin.lng}`,
    context.originRegion ? `出発地の地域: ${context.originRegion}` : null,
    context.originAreaLabel ? `出発地の地方: ${context.originAreaLabel}` : null,
    context.prefectureHint || null,
    `希望: ${context.query}`,
    "条件: 徒歩または在来線で行ける範囲",
    context.hasMaxMinutes
      ? `所要時間上限: ${context.maxMinutes}分以内`
      : "所要時間上限: 指定なし",
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * 利用ツール設定を解決する。
 * @returns {any[] | undefined} ツール設定。
 */
function resolveToolsConfig() {
  return WEB_SEARCH_TOOL && WEB_SEARCH_TOOL !== "off"
    ? [{ type: WEB_SEARCH_TOOL }]
    : undefined;
}

/**
 * OpenAIリクエストを作成する。
 * @param {string} systemPrompt システムプロンプト。
 * @param {string} userContent ユーザー入力。
 * @returns {any} リクエストペイロード。
 */
function buildOpenAIRequestPayload(systemPrompt, userContent) {
  const input = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
  const tools = resolveToolsConfig();
  /**
   * @type {{
   *   model: string,
   *   input: any[],
   *   tools: any[] | undefined,
   *   temperature: number,
   *   text?: { format: { type: string } }
   * }}
   */
  const requestPayload = {
    model: OPENAI_MODEL,
    input,
    tools,
    temperature: 0.2,
  };
  if (!tools) {
    requestPayload.text = { format: { type: "json_object" } };
  }
  return requestPayload;
}

/**
 * 散歩ルートのレスポンスを送信する。
 * @param {any} options 送信オプション。
 */
function handleWalkRouteResult(
  /**
   * @type {{
   *   result: any,
   *   originRegion: string,
   *   effectiveTargetMinutes: number,
   *   outputText: string,
   *   sendOnce: any
   * }}
   */
  { result, originRegion, effectiveTargetMinutes, outputText, sendOnce }
) {
  const stops = extractStopsFromResult(result);
  if (stops.length < 2) {
    console.error("OpenAI raw output:", outputText);
    sendOnce(500, { error: "散歩ルートの地点が取得できませんでした。" });
  } else {
    const parsedTargetMinutes = Number.parseInt(result.target_minutes, 10);
    const targetMinutes =
      Number.isFinite(parsedTargetMinutes) && parsedTargetMinutes > 0
        ? parsedTargetMinutes
        : effectiveTargetMinutes;
    sendOnce(200, {
      place: {
        route_type: "walk_multi",
        name: result.route_name || "おすすめ散歩ルート",
        area: result.area || originRegion || "",
        reason: result.reason,
        target_minutes: targetMinutes,
        stops,
        sources: Array.isArray(result.source_urls) ? result.source_urls : [],
      },
    });
  }
}

/**
 * スポットのレスポンスを送信する。
 * @param {any} result 解析結果。
 * @param {any} sendOnce 応答関数。
 */
function handleSpotResult(result, sendOnce) {
  sendOnce(200, {
    place: {
      name: result.place_name,
      address: result.place_address,
      reason: result.reason,
      sources: Array.isArray(result.source_urls) ? result.source_urls : [],
    },
  });
}

/**
 * 解析結果を処理して応答する。
 * @param {any} options 処理オプション。
 */
function handleRecommendResult(
  /**
   * @type {{
   *   outputText: string,
   *   isWalkRoute: boolean,
   *   originRegion: string,
   *   effectiveTargetMinutes: number,
   *   sendOnce: any
   * }}
   */
  { outputText, isWalkRoute, originRegion, effectiveTargetMinutes, sendOnce }
) {
  const result = parseJsonFromText(outputText);
  if (!result) {
    console.error("OpenAI raw output:", outputText);
    sendOnce(500, { error: "おすすめ地点の解析に失敗しました。" });
  } else if (result.error) {
    sendOnce(500, { error: result.error });
  } else if (isWalkRoute) {
    handleWalkRouteResult({
      result,
      originRegion,
      effectiveTargetMinutes,
      outputText,
      sendOnce,
    });
  } else {
    handleSpotResult(result, sendOnce);
  }
}

/**
 * おすすめAPIの処理を実行する。
 * @param {any} payload 入力データ。
 * @param {any} sendOnce 応答関数。
 * @returns {Promise<void>} 処理完了のPromise。
 */
async function handleRecommendPayload(payload, sendOnce) {
  const context = parseRecommendPayload(payload);
  const isValid = validateRecommendRequest(context, sendOnce);
  if (isValid) {
    const metrics = buildWalkRouteMetrics(context);
    const isWalkRoute = context.mode === "walk_route";
    const prefectureList = normalizePrefectureList(context.originPrefectures);
    const prefectureHint = buildPrefectureHint(prefectureList);
    const searchRegion = buildSearchRegion(
      context.originRegion,
      isWalkRoute,
      metrics.effectiveTargetMinutes
    );
    const promptContext = {
      ...context,
      ...metrics,
      isWalkRoute,
      prefectureHint,
      searchRegion,
    };
    const systemPrompt = isWalkRoute
      ? buildWalkRouteSystemPrompt(promptContext)
      : buildSpotSystemPrompt();
    const userContent = isWalkRoute
      ? buildWalkRouteUserContent(promptContext)
      : buildSpotUserContent(promptContext);
    const requestPayload = buildOpenAIRequestPayload(systemPrompt, userContent);
    const response = await callOpenAI(requestPayload);
    const outputText = extractOutputText(response);
    handleRecommendResult({
      outputText,
      isWalkRoute,
      originRegion: context.originRegion,
      effectiveTargetMinutes: metrics.effectiveTargetMinutes,
      sendOnce,
    });
  }
}

const server = http.createServer((req, res) => {
  const requestUrl = req.url || "/";
  const requestPath = decodeURIComponent(requestUrl.split("?")[0] || "/");
  if (requestPath === "/api/recommend") {
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
    } else if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed." });
    } else if (!OPENAI_API_KEY) {
      sendJson(res, 500, { error: "OPENAI_API_KEY が設定されていません。" });
    } else {
      readJson(req)
        .then(async (payload) => {
          let responseSent = false;
          const sendOnce = (
            /** @type {number} */ status,
            /** @type {any} */ responseBody
          ) => {
            if (!responseSent) {
              responseSent = true;
              sendJson(res, status, responseBody);
            }
          };
          await handleRecommendPayload(payload, sendOnce);
        })
        .catch((error) => {
          sendJson(res, 500, {
            error: error.message || "おすすめ地点の取得に失敗しました。",
          });
        });
    }
  } else {
    const relativePath = requestPath === "/" ? "/index.html" : requestPath;
    const filePath = safeJoin(ROOT, relativePath);

    if (!filePath) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        const status = err.code === "ENOENT" ? 404 : 500;
        res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(status === 404 ? "Not Found" : "Server Error");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      });
      res.end(data);
    });
  }
});

server.listen(PORT, () => {
  process.stdout.write(`Server running at http://localhost:${PORT}\n`);
});
