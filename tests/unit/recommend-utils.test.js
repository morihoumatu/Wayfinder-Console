/**
 * おすすめ検索ユーティリティの挙動を検証する。
 * @file
 */
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
  normalizePrefectureList,
  buildPrefectureHint,
  buildSearchRegion,
  buildDistanceHint,
} = require("../../server/recommend-utils");

const createSender = () => {
  /** @type {{ status: number, body: any }[]} */
  const calls = [];
  const sendOnce = (status, body) => {
    calls.push({ status, body });
  };
  return { calls, sendOnce };
};

// extractPrefectureの挙動をまとめて検証する。
describe("extractPrefecture", () => {
  it("都道府県抽出の結果をまとめて確認する", () => {
    const hit = extractPrefecture("東京都新宿区");
    const fallback = extractPrefecture("札幌市");
    expect({ hit, fallback }).toEqual({
      hit: "東京都",
      fallback: "札幌市",
    });
  });
});

// normalizeText/normalizeAdjustmentの挙動をまとめて検証する。
describe("normalizeText/normalizeAdjustment", () => {
  it("文字列正規化の結果をまとめて確認する", () => {
    const trimmed = normalizeText("  text ");
    const nonString = normalizeText(123);
    const adjustmentLonger = normalizeAdjustment("longer");
    const adjustmentShorter = normalizeAdjustment("shorter");
    const adjustmentOther = normalizeAdjustment("other");
    expect({
      trimmed,
      nonString,
      adjustmentLonger,
      adjustmentShorter,
      adjustmentOther,
    }).toEqual({
      trimmed: "text",
      nonString: "",
      adjustmentLonger: "longer",
      adjustmentShorter: "shorter",
      adjustmentOther: "",
    });
  });
});

// normalizeStringArray/parseRecommendPayloadの挙動をまとめて検証する。
describe("normalizeStringArray/parseRecommendPayload", () => {
  it("配列とペイロード正規化の結果をまとめて確認する", () => {
    const arrayResult = normalizeStringArray(["a", 1, "b"]);
    const payload = parseRecommendPayload({
      query: " cafe ",
      mode: "spot",
      maxMinutes: "30",
      targetMinutes: "60",
      adjustment: "longer",
      actualMinutes: "25",
      originRegion: "東京都",
      originLabel: "東京駅",
      originAreaLabel: "関東地方",
      originPrefectures: ["東京都", 12],
    });
    const payloadSummary = {
      query: payload.query,
      mode: payload.mode,
      maxMinutes: payload.maxMinutes,
      targetMinutes: payload.targetMinutes,
      adjustment: payload.adjustment,
      actualMinutes: payload.actualMinutes,
      originPrefectures: payload.originPrefectures,
    };
    expect({ arrayResult, payload: payloadSummary }).toEqual({
      arrayResult: ["a", "b"],
      payload: {
        query: "cafe",
        mode: "spot",
        maxMinutes: 30,
        targetMinutes: 60,
        adjustment: "longer",
        actualMinutes: 25,
        originPrefectures: ["東京都"],
      },
    });
  });
});

// validateRecommendRequestの挙動をまとめて検証する。
describe("validateRecommendRequest", () => {
  it("入力検証の結果をまとめて確認する", () => {
    const emptyQuery = createSender();
    const emptyResult = validateRecommendRequest(
      { query: "", mode: "spot", origin: { lat: 1, lng: 2 } },
      emptyQuery.sendOnce
    );

    const invalidOrigin = createSender();
    const invalidResult = validateRecommendRequest(
      { query: "cafe", mode: "spot", origin: null },
      invalidOrigin.sendOnce
    );

    expect({
      empty: { ok: emptyResult, status: emptyQuery.calls[0].status },
      invalid: { ok: invalidResult, status: invalidOrigin.calls[0].status },
    }).toEqual({
      empty: { ok: false, status: 400 },
      invalid: { ok: false, status: 400 },
    });
  });
});

// walk route metricsの挙動をまとめて検証する。
describe("walk route metrics", () => {
  it("距離と時間の計算結果をまとめて確認する", () => {
    const target = resolveEffectiveTargetMinutes(30, 0);
    const segment = buildSegmentRange(60);
    const longer = buildDistanceRange(4, "longer");
    const shorter = buildDistanceRange(4, "shorter");
    const metrics = buildWalkRouteMetrics({
      maxMinutes: 0,
      targetMinutes: 60,
      adjustment: "",
      actualMinutes: 0,
    });
    expect({
      effectiveTargetMinutes: target.effectiveTargetMinutes,
      segmentStops: segment.desiredStops,
      segmentRange: segment.segmentRange,
      longerIsLonger: longer.distanceMaxKm > shorter.distanceMaxKm,
      metricsTarget: metrics.effectiveTargetMinutes,
      metricsHasStops: metrics.desiredStops > 0,
    }).toEqual({
      effectiveTargetMinutes: 30,
      segmentStops: 3,
      segmentRange: "11〜20",
      longerIsLonger: true,
      metricsTarget: 60,
      metricsHasStops: true,
    });
  });
});

// prefecture helpersの挙動をまとめて検証する。
describe("prefecture helpers", () => {
  it("都道府県情報の整形結果をまとめて確認する", () => {
    const list = normalizePrefectureList([" 東京都 ", ""]);
    const hint = buildPrefectureHint(list);
    const region = buildSearchRegion("東京都新宿区", true, 150);
    expect({ list, hint, region }).toEqual({
      list: ["東京都"],
      hint: "対象都道府県: 東京都",
      region: "東京都",
    });
  });
});

// buildDistanceHintの挙動をまとめて検証する。
describe("buildDistanceHint", () => {
  it("距離ヒントの結果をまとめて確認する", () => {
    const hint = buildDistanceHint(2, 4);
    expect({ hint }).toEqual({
      hint: "総距離の目安: 2〜4km",
    });
  });
});
