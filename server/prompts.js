/**
 * OpenAIプロンプト生成をまとめる。
 * @file OpenAIプロンプト生成をまとめる。
 */
const { buildDistanceHint } = require("./recommend-utils");

/**
 * 散歩ルート用のシステムプロンプトを作成する。
 * @param {any} context プロンプト情報。
 * @returns {string} システムプロンプト。
 */
function buildWalkRouteSystemPrompt(context) {
  // distanceHintを作成する。
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
  // labelの初期値を定義する。
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
  // adjustmentLabelを整形する。
  const adjustmentLabel = formatAdjustmentLabel(context.adjustment);
  // linesの一覧を用意する。
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
  // linesの一覧を用意する。
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

module.exports = {
  buildWalkRouteSystemPrompt,
  buildSpotSystemPrompt,
  formatOriginLine,
  formatAdjustmentLabel,
  buildWalkRouteUserContent,
  buildSpotUserContent,
};
