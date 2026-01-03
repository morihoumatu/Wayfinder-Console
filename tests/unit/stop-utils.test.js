/**
 * 立ち寄り抽出ユーティリティの挙動を検証する。
 * @file
 */
const {
  isStopLike,
  cleanStopLine,
  parseStopString,
  normalizeStops,
  collectStopCandidates,
  selectStopsFromCandidates,
  extractStopsFromResult,
} = require("../../server/stop-utils");

// isStopLike/cleanStopLineの挙動をまとめて検証する。
describe("isStopLike/cleanStopLine", () => {
  it("判定と整形の結果をまとめて確認する", () => {
    // stopLikeを取得する。
    const stopLike = isStopLike({ name: "A" });
    // notStopLikeを取得する。
    const notStopLike = isStopLike({});
    // cleanedNumberを取得する。
    const cleanedNumber = cleanStopLine("1. 駅前公園");
    // cleanedDotを取得する。
    const cleanedDot = cleanStopLine("・カフェ");
    expect({ stopLike, notStopLike, cleanedNumber, cleanedDot }).toEqual({
      stopLike: true,
      notStopLike: false,
      cleanedNumber: "駅前公園",
      cleanedDot: "カフェ",
    });
  });
});

// parseStopStringの挙動をまとめて検証する。
describe("parseStopString", () => {
  it("文字列分解の結果をまとめて確認する", () => {
    // emptyStopsを解析する。
    const emptyStops = parseStopString("   ");
    // arrowStopsを解析する。
    const arrowStops = parseStopString("A → B");
    // newlineStopsを解析する。
    const newlineStops = parseStopString("A\nB");
    // dotStopsを解析する。
    const dotStops = parseStopString("A・B");
    expect({
      emptyStops,
      arrowStops,
      newlineCount: newlineStops.length,
      dotStops,
    }).toEqual({
      emptyStops: [],
      arrowStops: [
        { name: "A", address: "" },
        { name: "B", address: "" },
      ],
      newlineCount: 2,
      dotStops: [
        { name: "A", address: "" },
        { name: "B", address: "" },
      ],
    });
  });
});

// normalizeStops/collectStopCandidatesの挙動をまとめて検証する。
describe("normalizeStops/collectStopCandidates", () => {
  it("候補の整形結果をまとめて確認する", () => {
    // normalizedを正規化する。
    const normalized = normalizeStops([
      { name: "A", address: "Tokyo" },
      { name: " ", address: "X" },
    ]);
    // IDを取得する。
    const candidates = collectStopCandidates([
      { name: "A", address: "Tokyo" },
      { name: "B" },
    ]);
    expect({ normalized, candidates }).toEqual({
      normalized: [{ name: "A", address: "Tokyo" }],
      candidates: [{ name: "A", address: "Tokyo" }],
    });
  });
});

// selectStopsFromCandidates/extractStopsFromResultの挙動をまとめて検証する。
describe("selectStopsFromCandidates/extractStopsFromResult", () => {
  it("候補抽出の結果をまとめて確認する", () => {
    // 一覧を取得する。
    const list = Array.from({ length: 10 }, (_, index) => ({
      name: `Stop${index}`,
      address: "X",
    }));
    // selectedを取得する。
    const selected = selectStopsFromCandidates(list);
    // 一覧を取得する。
    const fromArray = extractStopsFromResult({
      stops: [{ name: "A", address: "Tokyo" }],
    });
    // fromStringを取得する。
    const fromString = extractStopsFromResult({
      stops: "A → B",
    });
    // fromPointsを取得する。
    const fromPoints = extractStopsFromResult({
      points: [{ name: "X", address: "Y" }],
    });
    // fromPlacesを取得する。
    const fromPlaces = extractStopsFromResult({
      places: "C・D",
    });
    expect({
      selectedCount: selected.length,
      fromArray,
      fromStringCount: fromString.length,
      fromPoints,
      fromPlacesCount: fromPlaces.length,
    }).toEqual({
      selectedCount: 8,
      fromArray: [{ name: "A", address: "Tokyo" }],
      fromStringCount: 2,
      fromPoints: [{ name: "X", address: "Y" }],
      fromPlacesCount: 2,
    });
  });
});
