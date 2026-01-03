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

describe("extractPrefecture", () => {
  it("都道府県名を抽出する", () => {
    expect(extractPrefecture("東京都新宿区")).toBe("東京都");
  });

  it("抽出できない場合は入力を返す", () => {
    expect(extractPrefecture("札幌市")).toBe("札幌市");
  });
});

describe("normalizeText/normalizeAdjustment", () => {
  it("文字列をトリムして返す", () => {
    expect(normalizeText("  text ")).toBe("text");
    expect(normalizeText(123)).toBe("");
  });

  it("調整指示は許可値のみ返す", () => {
    expect(normalizeAdjustment("longer")).toBe("longer");
    expect(normalizeAdjustment("shorter")).toBe("shorter");
    expect(normalizeAdjustment("other")).toBe("");
  });
});

describe("normalizeStringArray/parseRecommendPayload", () => {
  it("配列内の文字列のみ抽出する", () => {
    const result = normalizeStringArray(["a", 1, "b"]);
    expect(result).toEqual(["a", "b"]);
  });

  it("入力を正規化して返す", () => {
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
    expect(payload.query).toBe("cafe");
    expect(payload.mode).toBe("spot");
    expect(payload.maxMinutes).toBe(30);
    expect(payload.targetMinutes).toBe(60);
    expect(payload.adjustment).toBe("longer");
    expect(payload.actualMinutes).toBe(25);
    expect(payload.originPrefectures).toEqual(["東京都"]);
  });
});

describe("validateRecommendRequest", () => {
  it("検索キーワードが空のときはエラー", () => {
    const { calls, sendOnce } = createSender();
    const result = validateRecommendRequest(
      { query: "", mode: "spot", origin: { lat: 1, lng: 2 } },
      sendOnce
    );
    expect(result).toBe(false);
    expect(calls[0].status).toBe(400);
  });

  it("出発地が不正な場合はエラー", () => {
    const { calls, sendOnce } = createSender();
    const result = validateRecommendRequest(
      { query: "cafe", mode: "spot", origin: null },
      sendOnce
    );
    expect(result).toBe(false);
    expect(calls[0].status).toBe(400);
  });
});

describe("walk route metrics", () => {
  it("目標時間と区間レンジを算出する", () => {
    const target = resolveEffectiveTargetMinutes(30, 0);
    expect(target.effectiveTargetMinutes).toBe(30);
    const segment = buildSegmentRange(60);
    expect(segment.desiredStops).toBe(3);
    expect(segment.segmentRange).toBe("11〜20");
  });

  it("距離レンジの調整を反映する", () => {
    const longer = buildDistanceRange(4, "longer");
    const shorter = buildDistanceRange(4, "shorter");
    expect(longer.distanceMaxKm).toBeGreaterThan(shorter.distanceMaxKm);
  });

  it("散歩ルート向けの計算値をまとめる", () => {
    const metrics = buildWalkRouteMetrics({
      maxMinutes: 0,
      targetMinutes: 60,
      adjustment: "",
      actualMinutes: 0,
    });
    expect(metrics.effectiveTargetMinutes).toBe(60);
    expect(metrics.desiredStops).toBeGreaterThan(0);
  });
});

describe("prefecture helpers", () => {
  it("都道府県リストとヒントを整形する", () => {
    const list = normalizePrefectureList([" 東京都 ", ""]);
    expect(list).toEqual(["東京都"]);
    expect(buildPrefectureHint(list)).toBe("対象都道府県: 東京都");
  });

  it("散歩ルート時に検索地域を都道府県へ寄せる", () => {
    const region = buildSearchRegion("東京都新宿区", true, 150);
    expect(region).toBe("東京都");
  });
});

describe("buildDistanceHint", () => {
  it("距離ヒントを生成する", () => {
    const hint = buildDistanceHint(2, 4);
    expect(hint).toBe("総距離の目安: 2〜4km");
  });
});
