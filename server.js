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
  if (!targetPath.startsWith(base)) {
    return null;
  }
  return targetPath;
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
  if (typeof response.output_text === "string") {
    return response.output_text;
  }
  if (!Array.isArray(response.output)) {
    return "";
  }
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
  return textChunks.join("\n").trim();
}

/**
 * テキストからJSONを抽出して解析する。
 * @param {string} text 入力テキスト。
 * @returns {any} 解析結果。
 */
function parseJsonFromText(text) {
  if (!text) {
    return null;
  }
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    // Try fenced JSON blocks first.
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch && typeof fencedMatch[1] === "string") {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch (innerError) {
        // Fall through to scanning.
      }
    }
    return findJsonInText(trimmed);
  }
}

/**
 * 立ち寄り候補として扱えるか判定する。
 * @param {any} entry 候補データ。
 * @returns {boolean} 判定結果。
 */
function isStopLike(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  return (
    typeof entry.name === "string" ||
    typeof entry.address === "string" ||
    typeof entry.title === "string"
  );
}

/**
 * 立ち寄り行から記号を除去する。
 * @param {string} line 入力行。
 * @returns {string} 整形済み行。
 */
function cleanStopLine(line) {
  if (!line) {
    return "";
  }
  return line.replace(/^[\s*・\-–—•\d+.、)]+/, "").trim();
}

/**
 * 文字列から立ち寄り情報を解析する。
 * @param {string} value 入力文字列。
 * @returns {Array<{ name: string, address: string }>} 立ち寄り配列。
 */
function parseStopString(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
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
  return parts.map((/** @type {string} */ part) => ({
    name: part,
    address: "",
  }));
}

/**
 * 立ち寄りデータを配列に正規化する。
 * @param {any} rawStops 元データ。
 * @returns {any[]} 正規化配列。
 */
function normalizeStops(rawStops) {
  if (!rawStops) {
    return [];
  }
  if (Array.isArray(rawStops)) {
    return rawStops.filter(Boolean);
  }
  if (typeof rawStops === "string") {
    return parseStopString(rawStops);
  }
  if (isStopLike(rawStops)) {
    return [rawStops];
  }
  if (typeof rawStops === "object") {
    return Object.values(rawStops).filter(
      (entry) => entry && (typeof entry === "string" || isStopLike(entry))
    );
  }
  return [];
}

/**
 * 結果オブジェクトから立ち寄り情報を抽出する。
 * @param {any} result 結果データ。
 * @returns {any[]} 立ち寄り配列。
 */
function extractStopsFromResult(result) {
  if (!result) {
    return [];
  }
  if (Array.isArray(result)) {
    return normalizeStops(result);
  }
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
  if (
    result.route &&
    (Array.isArray(result.route) ||
      typeof result.route === "string" ||
      isStopLike(result.route))
  ) {
    candidates.push(result.route);
  }
  if (
    result.itinerary &&
    (Array.isArray(result.itinerary) ||
      typeof result.itinerary === "string" ||
      isStopLike(result.itinerary))
  ) {
    candidates.push(result.itinerary);
  }
  for (const candidate of candidates) {
    const normalized = normalizeStops(candidate);
    if (normalized.length) {
      return normalized;
    }
  }
  return [];
}

/**
 * テキスト内のJSONを探索する。
 * @param {string} text 入力テキスト。
 * @returns {any} 抽出したJSON。
 */
function findJsonInText(text) {
  if (!text) {
    return null;
  }
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
      return JSON.parse(snippet);
    } catch (error) {
      continue;
    }
  }
  return null;
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
  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\" && i + 1 < text.length) {
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
        return i;
      }
    }
  }
  return -1;
}

/**
 * 地域名から都道府県を抽出する。
 * @param {string} region 地域名。
 * @returns {string} 都道府県名。
 */
function extractPrefecture(region) {
  if (!region) {
    return "";
  }
  const match = region.match(/^(.+?[都道府県])/);
  if (match && typeof match[1] === "string") {
    return match[1];
  }
  return region;
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
          try {
            parsed = JSON.parse(body);
          } catch (error) {
            reject(new Error("OpenAI response parse error."));
            return;
          }
          if (response.statusCode && response.statusCode >= 400) {
            const message =
              parsed?.error?.message || "OpenAI API request failed.";
            reject(new Error(message));
            return;
          }
          resolve(parsed);
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

const server = http.createServer((req, res) => {
  const requestUrl = req.url || "/";
  const requestPath = decodeURIComponent(requestUrl.split("?")[0] || "/");
  if (requestPath === "/api/recommend") {
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }
    if (!OPENAI_API_KEY) {
      sendJson(res, 500, { error: "OPENAI_API_KEY が設定されていません。" });
      return;
    }

    readJson(req)
      .then(async (payload) => {
        const query = typeof payload?.query === "string" ? payload.query.trim() : "";
        const mode = payload?.mode === "walk_route" ? "walk_route" : "spot";
        const origin = payload?.origin;
        if (!query && mode !== "walk_route") {
          sendJson(res, 400, { error: "検索キーワードが空です。" });
          return;
        }
        if (
          !origin ||
          typeof origin.lat !== "number" ||
          typeof origin.lng !== "number"
        ) {
          sendJson(res, 400, { error: "出発地の座標が不正です。" });
          return;
        }

        const maxMinutes = Number.parseInt(payload?.maxMinutes, 10);
        const hasMaxMinutes =
          Number.isFinite(maxMinutes) && maxMinutes > 0;
        const targetMinutes = Number.parseInt(payload?.targetMinutes, 10);
        const hasTargetMinutes =
          Number.isFinite(targetMinutes) && targetMinutes > 0;
        const effectiveTargetMinutes = hasTargetMinutes
          ? targetMinutes
          : hasMaxMinutes
            ? maxMinutes
            : DEFAULT_WALK_TARGET_MINUTES;
        const adjustment =
          payload?.adjustment === "longer" || payload?.adjustment === "shorter"
            ? payload.adjustment
            : "";
        const actualMinutes = Number.parseInt(payload?.actualMinutes, 10);
        const hasActualMinutes =
          Number.isFinite(actualMinutes) && actualMinutes > 0;
        const estimatedDistanceKm = Number.isFinite(effectiveTargetMinutes)
          ? Math.round(effectiveTargetMinutes * 0.08 * 10) / 10
          : null;
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
        const originRegion =
          typeof payload?.originRegion === "string"
            ? payload.originRegion.trim()
            : "";
        const originLabel =
          typeof payload?.originLabel === "string"
            ? payload.originLabel.trim()
            : "";
        const originAreaLabel =
          typeof payload?.originAreaLabel === "string"
            ? payload.originAreaLabel.trim()
            : "";
        /** @type {string[]} */
        const originPrefectures = Array.isArray(payload?.originPrefectures)
          ? payload.originPrefectures.filter(
              (/** @type {string} */ entry) => typeof entry === "string"
            )
          : [];
        const searchRegion =
          mode === "walk_route" && effectiveTargetMinutes >= 120
            ? extractPrefecture(originRegion) || originRegion
            : originRegion;
        const prefectureList = originPrefectures
          .map((/** @type {string} */ entry) => entry.trim())
          .filter(Boolean);
        const prefectureHint = prefectureList.length
          ? `対象都道府県: ${prefectureList.join("・")}`
          : "";

        const isWalkRoute = mode === "walk_route";
        const systemPrompt = isWalkRoute
          ? [
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
              `立ち寄り地点は${desiredStops}件程度。各地点は徒歩${segmentRange}分程度の間隔で配置してください。`,
              distanceMinKm && distanceMaxKm
                ? `総距離の目安: ${distanceMinKm}〜${distanceMaxKm}km`
                : "総距離の目安: 目標所要時間に合わせて調整",
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
            ].join("\n")
          : [
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

        const input = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: isWalkRoute
              ? [
                  originLabel
                    ? `出発地: ${originLabel} (座標: ${origin.lat}, ${origin.lng})`
                    : `出発地: ${origin.lat}, ${origin.lng}`,
                  searchRegion ? `出発地の地域: ${searchRegion}` : null,
                  originAreaLabel ? `出発地の地方: ${originAreaLabel}` : null,
                  prefectureHint || null,
                  `テーマ: ${query || "散歩"}`,
                  `目標所要時間: ${effectiveTargetMinutes}分前後`,
                  estimatedDistanceKm
                    ? `目安の総距離: 約${estimatedDistanceKm}km`
                    : null,
                  hasActualMinutes
                    ? `前回のGoogle Maps実測: ${actualMinutes}分`
                    : null,
                  adjustment
                    ? `調整指示: ${
                        adjustment === "longer" ? "前回より長め" : "前回より短め"
                      }`
                    : null,
                  "条件: 徒歩中心、必要なら在来線を組み合わせる",
                ]
                  .filter(Boolean)
                  .join("\n")
              : [
                  `出発地: ${origin.lat}, ${origin.lng}`,
                  originRegion ? `出発地の地域: ${originRegion}` : null,
                  originAreaLabel ? `出発地の地方: ${originAreaLabel}` : null,
                  prefectureHint || null,
                  `希望: ${query}`,
                  "条件: 徒歩または在来線で行ける範囲",
                  hasMaxMinutes
                    ? `所要時間上限: ${maxMinutes}分以内`
                    : "所要時間上限: 指定なし",
                ]
                  .filter(Boolean)
                  .join("\n"),
          },
        ];

        const tools =
          WEB_SEARCH_TOOL && WEB_SEARCH_TOOL !== "off"
            ? [{ type: WEB_SEARCH_TOOL }]
            : undefined;

        /** @type {{ model: string, input: any[], tools: any[] | undefined, temperature: number, text?: { format: { type: string } } }} */
        const requestPayload = {
          model: OPENAI_MODEL,
          input,
          tools,
          temperature: 0.2,
        };
        if (!tools) {
          requestPayload.text = { format: { type: "json_object" } };
        }

        const response = await callOpenAI(requestPayload);

        const outputText = extractOutputText(response);
        const result = parseJsonFromText(outputText);
        if (!result) {
          console.error("OpenAI raw output:", outputText);
          sendJson(res, 500, {
            error: "おすすめ地点の解析に失敗しました。",
          });
          return;
        }
        if (result.error) {
          sendJson(res, 500, { error: result.error });
          return;
        }

        if (isWalkRoute) {
          const stops = extractStopsFromResult(result);
          if (stops.length < 2) {
            console.error("OpenAI raw output:", outputText);
            sendJson(res, 500, {
              error: "散歩ルートの地点が取得できませんでした。",
            });
            return;
          }
          const parsedTargetMinutes = Number.parseInt(
            result.target_minutes,
            10
          );
          sendJson(res, 200, {
            place: {
              route_type: "walk_multi",
              name: result.route_name || "おすすめ散歩ルート",
              area: result.area || originRegion || "",
              reason: result.reason,
              target_minutes:
                Number.isFinite(parsedTargetMinutes) && parsedTargetMinutes > 0
                  ? parsedTargetMinutes
                  : effectiveTargetMinutes,
              stops,
              sources: Array.isArray(result.source_urls)
                ? result.source_urls
                : [],
            },
          });
          return;
        }

        sendJson(res, 200, {
          place: {
            name: result.place_name,
            address: result.place_address,
            reason: result.reason,
            sources: Array.isArray(result.source_urls)
              ? result.source_urls
              : [],
          },
        });
      })
      .catch((error) => {
        sendJson(res, 500, {
          error: error.message || "おすすめ地点の取得に失敗しました。",
        });
      });
    return;
  }

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
});

server.listen(PORT, () => {
  process.stdout.write(`Server running at http://localhost:${PORT}\n`);
});
