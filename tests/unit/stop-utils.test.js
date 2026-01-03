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

describe("isStopLike/cleanStopLine", () => {
  it("立ち寄り候補の形状を判定する", () => {
    expect(isStopLike({ name: "A" })).toBe(true);
    expect(isStopLike({})).toBe(false);
  });

  it("先頭の記号や番号を除去する", () => {
    expect(cleanStopLine("1. 駅前公園")).toBe("駅前公園");
    expect(cleanStopLine("・カフェ")).toBe("カフェ");
  });
});

describe("parseStopString", () => {
  it("矢印区切りの行を分解する", () => {
    const stops = parseStopString("A → B");
    expect(stops).toEqual([
      { name: "A", address: "" },
      { name: "B", address: "" },
    ]);
  });

  it("改行区切りの行を分解する", () => {
    const stops = parseStopString("A\nB");
    expect(stops.length).toBe(2);
  });
});

describe("normalizeStops/collectStopCandidates", () => {
  it("空の候補を除外する", () => {
    const normalized = normalizeStops([
      { name: "A", address: "Tokyo" },
      { name: " ", address: "X" },
    ]);
    expect(normalized).toEqual([{ name: "A", address: "Tokyo" }]);
  });

  it("name/addressが揃った候補だけを抽出する", () => {
    const candidates = collectStopCandidates([
      { name: "A", address: "Tokyo" },
      { name: "B" },
    ]);
    expect(candidates).toEqual([{ name: "A", address: "Tokyo" }]);
  });
});

describe("selectStopsFromCandidates/extractStopsFromResult", () => {
  it("候補から最大8件を返す", () => {
    const list = Array.from({ length: 10 }, (_, index) => ({
      name: `Stop${index}`,
      address: "X",
    }));
    expect(selectStopsFromCandidates(list)).toHaveLength(8);
  });

  it("配列または文字列から立ち寄りを抽出する", () => {
    const fromArray = extractStopsFromResult({
      stops: [{ name: "A", address: "Tokyo" }],
    });
    const fromString = extractStopsFromResult({
      stops: "A → B",
    });
    expect(fromArray).toEqual([{ name: "A", address: "Tokyo" }]);
    expect(fromString.length).toBe(2);
  });
});
