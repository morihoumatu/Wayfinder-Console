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

// senderを作成する処理を定義する。
const createSender = () => {
  /** @type {{ status: number, body: any }[]} */
  const calls = [];
  // sendOnceの処理を定義する。
  const sendOnce = (status, body) => {
    calls.push({ status, body });
  };
  return { calls, sendOnce };
};

// extractPrefectureの挙動をまとめて検証する。
describe("extractPrefecture", () => {
  it("都道府県抽出の結果をまとめて確認する", () => {
    // hitを取得する。
    const hit = extractPrefecture("東京都新宿区");
    // fallbackを取得する。
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
    // trimmedを正規化する。
    const trimmed = normalizeText("  text ");
    // nonStringを正規化する。
    const nonString = normalizeText(123);
    // adjustmentLongerを正規化する。
    const adjustmentLonger = normalizeAdjustment("longer");
    // adjustmentShorterを正規化する。
    const adjustmentShorter = normalizeAdjustment("shorter");
    // adjustmentOtherを正規化する。
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
    // 一覧を正規化する。
    const arrayResult = normalizeStringArray(["a", 1, "b"]);
    // ペイロードを解析する。
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
    // ペイロードをまとめる。
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
    // emptyQueryを作成する。
    const emptyQuery = createSender();
    // 結果を取得する。
    const emptyResult = validateRecommendRequest(
      { query: "", mode: "spot", origin: { lat: 1, lng: 2 } },
      emptyQuery.sendOnce
    );

    // IDを作成する。
    const invalidOrigin = createSender();
    // 結果を取得する。
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
    // targetを解決する。
    const target = resolveEffectiveTargetMinutes(30, 0);
    // segmentを作成する。
    const segment = buildSegmentRange(60);
    // longerを作成する。
    const longer = buildDistanceRange(4, "longer");
    // shorterを作成する。
    const shorter = buildDistanceRange(4, "shorter");
    // metricsを作成する。
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
    // 一覧を正規化する。
    const list = normalizePrefectureList([" 東京都 ", ""]);
    // hintを作成する。
    const hint = buildPrefectureHint(list);
    // regionを作成する。
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
    // hintを作成する。
    const hint = buildDistanceHint(2, 4);
    expect({ hint }).toEqual({
      hint: "総距離の目安: 2〜4km",
    });
  });
});
