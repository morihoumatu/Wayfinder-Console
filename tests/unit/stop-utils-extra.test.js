/**
 * 立ち寄り抽出ユーティリティの追加ケースを検証する。
 * @file
 */
// stop-utilsから必要な値を取得する。
const {
  isStopLike,
  cleanStopLine,
  parseStopString,
  normalizeStops,
  isStopCandidate,
  collectStopCandidates,
  selectStopsFromCandidates,
  extractStopsFromResult,
} = require("../../server/stop-utils");

// isStopLikeの追加ケースを検証する。
describe("isStopLike extra title", () => {
  it("タイトルを持つ場合の判定を確認する", () => {
    // resultを取得する。
    const result = isStopLike({ title: "Spot" });
    expect({ result }).toEqual({ result: true });
  });
});

// isStopLikeの追加ケースを検証する。
describe("isStopLike extra address", () => {
  it("住所を持つ場合の判定を確認する", () => {
    // resultを取得する。
    const result = isStopLike({ address: "Tokyo" });
    expect({ result }).toEqual({ result: true });
  });
});

// cleanStopLineの追加ケースを検証する。
describe("cleanStopLine extra dash", () => {
  it("記号の除去結果を確認する", () => {
    // cleanedを取得する。
    const cleaned = cleanStopLine("- 公園");
    expect({ cleaned }).toEqual({ cleaned: "公園" });
  });
});

// cleanStopLineの追加ケースを検証する。
describe("cleanStopLine extra empty", () => {
  it("空文字入力の結果を確認する", () => {
    // cleanedを取得する。
    const cleaned = cleanStopLine("");
    expect({ cleaned }).toEqual({ cleaned: "" });
  });
});

// parseStopStringの追加ケースを検証する。
describe("parseStopString extra comma", () => {
  it("カンマ区切りの解析結果を確認する", () => {
    // stopsを取得する。
    const stops = parseStopString("Cafe,Tokyo");
    expect({ stops }).toEqual({
      stops: [{ name: "Cafe", address: "Tokyo" }],
    });
  });
});

// parseStopStringの追加ケースを検証する。
describe("parseStopString extra space", () => {
  it("スペース区切りの解析結果を確認する", () => {
    // stopsを取得する。
    const stops = parseStopString("Park Tokyo");
    expect({ stops }).toEqual({
      stops: [{ name: "Park", address: "Tokyo" }],
    });
  });
});

// normalizeStopsの追加ケースを検証する。
describe("normalizeStops extra", () => {
  it("空の名前が除外されることを確認する", () => {
    // normalizedを取得する。
    const normalized = normalizeStops([
      { name: " A ", address: " X " },
      { name: "", address: "Y" },
      { name: 1, address: 2 },
    ]);
    expect({ normalized }).toEqual({
      normalized: [{ name: "A", address: "X" }],
    });
  });
});

// isStopCandidateの追加ケースを検証する。
describe("isStopCandidate extra", () => {
  it("住所が無い場合の判定を確認する", () => {
    // resultを取得する。
    const result = isStopCandidate({ name: "A", address: 1 });
    expect({ result }).toEqual({ result: false });
  });
});

// collectStopCandidatesの追加ケースを検証する。
describe("collectStopCandidates extra", () => {
  it("配列以外の入力結果を確認する", () => {
    // candidatesを取得する。
    const candidates = collectStopCandidates("invalid");
    expect({ candidates }).toEqual({ candidates: [] });
  });
});

// selectStopsFromCandidatesの追加ケースを検証する。
describe("selectStopsFromCandidates extra", () => {
  it("候補数が少ない場合の結果を確認する", () => {
    // candidatesを取得する。
    const candidates = [
      { name: "A", address: "X" },
      { name: "B", address: "Y" },
    ];
    // selectedを取得する。
    const selected = selectStopsFromCandidates(candidates);
    expect({ selected }).toEqual({ selected: candidates });
  });
});

// extractStopsFromResultの追加ケースを検証する。
describe("extractStopsFromResult extra", () => {
  it("不正な入力値の結果を確認する", () => {
    // stopsを取得する。
    const stops = extractStopsFromResult({ stops: 123 });
    expect({ stops }).toEqual({ stops: [] });
  });
});
