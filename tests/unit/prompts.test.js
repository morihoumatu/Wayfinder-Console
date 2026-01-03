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

// フォーマット補助関数の挙動をまとめて検証する。
describe("format helpers", () => {
  it("表示用文字列の結果をまとめて確認する", () => {
    // originWithLabelを整形する。
    const originWithLabel = formatOriginLine("東京駅", { lat: 1, lng: 2 });
    // originWithoutLabelを整形する。
    const originWithoutLabel = formatOriginLine("", { lat: 1, lng: 2 });
    // adjustmentLongerを整形する。
    const adjustmentLonger = formatAdjustmentLabel("longer");
    // adjustmentShorterを整形する。
    const adjustmentShorter = formatAdjustmentLabel("shorter");
    // adjustmentEmptyを整形する。
    const adjustmentEmpty = formatAdjustmentLabel("");
    expect({
      originWithLabel,
      originWithoutLabel,
      adjustmentLonger,
      adjustmentShorter,
      adjustmentEmpty,
    }).toEqual({
      originWithLabel: "出発地: 東京駅 (座標: 1, 2)",
      originWithoutLabel: "出発地: 1, 2",
      adjustmentLonger: "調整指示: 前回より長め",
      adjustmentShorter: "調整指示: 前回より短め",
      adjustmentEmpty: "",
    });
  });
});

// system promptの挙動をまとめて検証する。
describe("system prompts", () => {
  it("プロンプト生成結果をまとめて確認する", () => {
    // walkPromptを作成する。
    const walkPrompt = buildWalkRouteSystemPrompt({
      distanceMinKm: 2,
      distanceMaxKm: 4,
      desiredStops: 3,
      segmentRange: "10〜15",
    });
    // spotPromptを作成する。
    const spotPrompt = buildSpotSystemPrompt();
    expect({
      walkHasDistance: walkPrompt.includes("総距離の目安: 2〜4km"),
      walkHasStops: walkPrompt.includes("立ち寄り地点は3件程度"),
      spotHasFormat: spotPrompt.includes("\"place_name\""),
    }).toEqual({
      walkHasDistance: true,
      walkHasStops: true,
      spotHasFormat: true,
    });
  });
});

// user promptの挙動をまとめて検証する。
describe("user prompts", () => {
  it("ユーザー入力の生成結果をまとめて確認する", () => {
    // walkContentを作成する。
    const walkContent = buildWalkRouteUserContent({
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
    // spotContentを作成する。
    const spotContent = buildSpotUserContent({
      origin: { lat: 1, lng: 2 },
      originRegion: "東京都",
      originAreaLabel: "関東地方",
      prefectureHint: "",
      query: "カフェ",
      hasMaxMinutes: false,
      maxMinutes: 0,
    });
    expect({
      walkHasOrigin: walkContent.includes("出発地: 東京駅"),
      walkHasTarget: walkContent.includes("目標所要時間: 60分前後"),
      spotHasQuery: spotContent.includes("希望: カフェ"),
      spotHasLimit: spotContent.includes("所要時間上限: 指定なし"),
    }).toEqual({
      walkHasOrigin: true,
      walkHasTarget: true,
      spotHasQuery: true,
      spotHasLimit: true,
    });
  });
});
