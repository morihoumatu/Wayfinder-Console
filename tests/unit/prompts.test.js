/**
 * プロンプト生成の挙動を検証する。
 * @file
 */
const {
  buildWalkRouteSystemPrompt,
  buildSpotSystemPrompt,
  formatOriginLine,
  formatAdjustmentLabel,
  buildWalkRouteUserContent,
  buildSpotUserContent,
} = require("../../server/prompts");

describe("format helpers", () => {
  it("出発地ラベルの有無で表示を切り替える", () => {
    expect(formatOriginLine("東京駅", { lat: 1, lng: 2 })).toBe(
      "出発地: 東京駅 (座標: 1, 2)"
    );
    expect(formatOriginLine("", { lat: 1, lng: 2 })).toBe("出発地: 1, 2");
  });

  it("調整指示のラベルを生成する", () => {
    expect(formatAdjustmentLabel("longer")).toBe("調整指示: 前回より長め");
    expect(formatAdjustmentLabel("shorter")).toBe("調整指示: 前回より短め");
    expect(formatAdjustmentLabel("")).toBe("");
  });
});

describe("system prompts", () => {
  it("散歩ルート用プロンプトに距離ヒントを含める", () => {
    const prompt = buildWalkRouteSystemPrompt({
      distanceMinKm: 2,
      distanceMaxKm: 4,
      desiredStops: 3,
      segmentRange: "10〜15",
    });
    expect(prompt).toContain("総距離の目安: 2〜4km");
    expect(prompt).toContain("立ち寄り地点は3件程度");
  });

  it("スポット用プロンプトに形式を含める", () => {
    const prompt = buildSpotSystemPrompt();
    expect(prompt).toContain("\"place_name\"");
  });
});

describe("user prompts", () => {
  it("散歩ルートのユーザー入力を生成する", () => {
    const content = buildWalkRouteUserContent({
      originLabel: "東京駅",
      origin: { lat: 1, lng: 2 },
      searchRegion: "東京都",
      originAreaLabel: "関東地方",
      prefectureHint: "対象都道府県: 東京都",
      query: "",
      effectiveTargetMinutes: 60,
      estimatedDistanceKm: 3,
      hasActualMinutes: false,
      adjustment: "",
    });
    expect(content).toContain("出発地: 東京駅");
    expect(content).toContain("目標所要時間: 60分前後");
  });

  it("スポットのユーザー入力を生成する", () => {
    const content = buildSpotUserContent({
      origin: { lat: 1, lng: 2 },
      originRegion: "東京都",
      originAreaLabel: "関東地方",
      prefectureHint: "",
      query: "カフェ",
      hasMaxMinutes: false,
      maxMinutes: 0,
    });
    expect(content).toContain("希望: カフェ");
    expect(content).toContain("所要時間上限: 指定なし");
  });
});
