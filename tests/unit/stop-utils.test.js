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
    const stopLike = isStopLike({ name: "A" });
    const notStopLike = isStopLike({});
    const cleanedNumber = cleanStopLine("1. 駅前公園");
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
    const emptyStops = parseStopString("   ");
    const arrowStops = parseStopString("A → B");
    const newlineStops = parseStopString("A\nB");
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
    const normalized = normalizeStops([
      { name: "A", address: "Tokyo" },
      { name: " ", address: "X" },
    ]);
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
    const list = Array.from({ length: 10 }, (_, index) => ({
      name: `Stop${index}`,
      address: "X",
    }));
    const selected = selectStopsFromCandidates(list);
    const fromArray = extractStopsFromResult({
      stops: [{ name: "A", address: "Tokyo" }],
    });
    const fromString = extractStopsFromResult({
      stops: "A → B",
    });
    const fromPoints = extractStopsFromResult({
      points: [{ name: "X", address: "Y" }],
    });
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
