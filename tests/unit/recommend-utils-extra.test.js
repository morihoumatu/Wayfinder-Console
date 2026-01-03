/**
 * おすすめ検索ユーティリティの追加ケースを検証する。
 * @file
 */
// recommend-utilsから必要な値を取得する。
const {
  extractPrefecture,
  normalizeText,
  normalizeAdjustment,
  normalizeStringArray,
  parseRecommendPayload,
  validateRecommendRequest,
  resolveEffectiveTargetMinutes,
  buildSegmentRange,
  buildDistanceRange,
  buildWalkRouteMetrics,
  buildSearchRegion,
} = require("../../server/recommend-utils");

// extractPrefectureの追加ケースを検証する。
describe("extractPrefecture extra", () => {
  it("府や地方名の抽出結果を確認する", () => {
    // osakaを取得する。
    const osaka = extractPrefecture("大阪府堺市");
    // regionを取得する。
    const region = extractPrefecture("関東地方");
    expect({ osaka, region }).toEqual({
      osaka: "大阪府",
      region: "関東地方",
    });
  });
});

// normalizeTextの追加ケースを検証する。
describe("normalizeText extra", () => {
  it("空値の正規化結果を確認する", () => {
    // emptyを取得する。
    const empty = normalizeText(null);
    // trimmedを取得する。
    const trimmed = normalizeText("  sample ");
    expect({ empty, trimmed }).toEqual({
      empty: "",
      trimmed: "sample",
    });
  });
});

// normalizeAdjustmentの追加ケースを検証する。
describe("normalizeAdjustment extra", () => {
  it("不正な入力の結果を確認する", () => {
    // upperを取得する。
    const upper = normalizeAdjustment("LONGER");
    // validを取得する。
    const valid = normalizeAdjustment("shorter");
    expect({ upper, valid }).toEqual({
      upper: "",
      valid: "shorter",
    });
  });
});

// normalizeStringArrayの追加ケースを検証する。
describe("normalizeStringArray extra", () => {
  it("配列以外の入力結果を確認する", () => {
    // nonArrayを取得する。
    const nonArray = normalizeStringArray("text");
    // filteredを取得する。
    const filtered = normalizeStringArray(["A", 1, "B"]);
    expect({ nonArray, filtered }).toEqual({
      nonArray: [],
      filtered: ["A", "B"],
    });
  });
});

// parseRecommendPayloadの追加ケースを検証する。
describe("parseRecommendPayload extra", () => {
  it("walk_routeと数値変換の結果を確認する", () => {
    // payloadを取得する。
    const payload = parseRecommendPayload({
      query: " ",
      mode: "walk_route",
      maxMinutes: "bad",
      targetMinutes: "",
      originPrefectures: ["東京", ""],
    });
    // summaryを取得する。
    const summary = {
      mode: payload.mode,
      query: payload.query,
      maxMinutesIsNaN: Number.isNaN(payload.maxMinutes),
      targetMinutesIsNaN: Number.isNaN(payload.targetMinutes),
      originPrefectures: payload.originPrefectures,
    };
    expect(summary).toEqual({
      mode: "walk_route",
      query: "",
      maxMinutesIsNaN: true,
      targetMinutesIsNaN: true,
      originPrefectures: ["東京", ""],
    });
  });
});

// validateRecommendRequestの追加ケースを検証する。
describe("validateRecommendRequest extra", () => {
  it("散歩ルートの空欄検索を許可する", () => {
    // callsを用意する。
    const calls = [];
    // sendOnceを用意する。
    const sendOnce = (status, body) => {
      calls.push({ status, body });
    };
    // resultを取得する。
    const result = validateRecommendRequest(
      { query: "", mode: "walk_route", origin: { lat: 1, lng: 2 } },
      sendOnce
    );
    expect({ result, calls: calls.length }).toEqual({
      result: true,
      calls: 0,
    });
  });
});

// resolveEffectiveTargetMinutesの追加ケースを検証する。
describe("resolveEffectiveTargetMinutes extra", () => {
  it("上限時間が優先される結果を確認する", () => {
    // resolvedを取得する。
    const resolved = resolveEffectiveTargetMinutes(90, 0);
    expect({
      hasMaxMinutes: resolved.hasMaxMinutes,
      hasTargetMinutes: resolved.hasTargetMinutes,
      effectiveTargetMinutes: resolved.effectiveTargetMinutes,
    }).toEqual({
      hasMaxMinutes: true,
      hasTargetMinutes: false,
      effectiveTargetMinutes: 90,
    });
  });
});

// buildSegmentRangeの追加ケースを検証する。
describe("buildSegmentRange extra", () => {
  it("長距離の区間レンジを確認する", () => {
    // rangeを取得する。
    const range = buildSegmentRange(180);
    expect({
      desiredStops: range.desiredStops,
      segmentRange: range.segmentRange,
    }).toEqual({
      desiredStops: 6,
      segmentRange: "18〜34",
    });
  });
});

// buildDistanceRangeの追加ケースを検証する。
describe("buildDistanceRange extra", () => {
  it("距離未設定時の結果を確認する", () => {
    // rangeを取得する。
    const range = buildDistanceRange(null, "");
    expect({
      min: range.distanceMinKm,
      max: range.distanceMaxKm,
    }).toEqual({
      min: null,
      max: null,
    });
  });
});

// buildWalkRouteMetricsの追加ケースを検証する。
describe("buildWalkRouteMetrics extra", () => {
  it("実績値ありの計算結果を確認する", () => {
    // metricsを取得する。
    const metrics = buildWalkRouteMetrics({
      maxMinutes: 0,
      targetMinutes: 120,
      adjustment: "",
      actualMinutes: 95,
    });
    expect({
      hasActualMinutes: metrics.hasActualMinutes,
      estimatedDistanceKm: metrics.estimatedDistanceKm,
      desiredStops: metrics.desiredStops,
    }).toEqual({
      hasActualMinutes: true,
      estimatedDistanceKm: 9.6,
      desiredStops: 5,
    });
  });
});

// buildSearchRegionの追加ケースを検証する。
describe("buildSearchRegion extra", () => {
  it("散歩以外と短時間では地域名を維持する", () => {
    // nonWalkを取得する。
    const nonWalk = buildSearchRegion("東京都新宿区", false, 200);
    // shortWalkを取得する。
    const shortWalk = buildSearchRegion("東京都新宿区", true, 60);
    expect({ nonWalk, shortWalk }).toEqual({
      nonWalk: "東京都新宿区",
      shortWalk: "東京都新宿区",
    });
  });
});
