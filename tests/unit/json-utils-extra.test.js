/**
 * JSONユーティリティの追加ケースを検証する。
 * @file
 */
// json-utilsから必要な値を取得する。
const {
  extractOutputText,
  parseJsonFromText,
  findJsonInText,
  isEscapedChar,
  findMatchingBracket,
} = require("../../server/json-utils");

// extractOutputTextの追加ケースを検証する。
describe("extractOutputText extra empty", () => {
  it("空のレスポンス結果を確認する", () => {
    // resultを取得する。
    const result = extractOutputText({});
    expect({ result }).toEqual({ result: "" });
  });
});

// extractOutputTextの追加ケースを検証する。
describe("extractOutputText extra missing text", () => {
  it("テキストが無い場合の結果を確認する", () => {
    // resultを取得する。
    const result = extractOutputText({
      output: [
        { content: [{ type: "output_text" }] },
        { content: [{ type: "text", text: "" }] },
      ],
    });
    expect({ result }).toEqual({ result: "" });
  });
});

// parseJsonFromTextの追加ケースを検証する。
describe("parseJsonFromText extra whitespace", () => {
  it("空白だけの入力結果を確認する", () => {
    // resultを取得する。
    const result = parseJsonFromText("   ");
    expect({ result }).toEqual({ result: null });
  });
});

// parseJsonFromTextの追加ケースを検証する。
describe("parseJsonFromText extra array", () => {
  it("配列JSONの解析結果を確認する", () => {
    // resultを取得する。
    const result = parseJsonFromText("[1,2]");
    expect({ result }).toEqual({ result: [1, 2] });
  });
});

// parseJsonFromTextの追加ケースを検証する。
describe("parseJsonFromText extra fenced", () => {
  it("コードブロックの解析結果を確認する", () => {
    // resultを取得する。
    const result = parseJsonFromText("```\n{\"ok\":true}\n```");
    expect({ result }).toEqual({ result: { ok: true } });
  });
});

// findJsonInTextの追加ケースを検証する。
describe("findJsonInText extra array", () => {
  it("文中の配列JSONを検出する", () => {
    // resultを取得する。
    const result = findJsonInText("note: [1,2,3] end");
    expect({ result }).toEqual({ result: [1, 2, 3] });
  });
});

// findJsonInTextの追加ケースを検証する。
describe("findJsonInText extra missing", () => {
  it("JSONが無い場合の結果を確認する", () => {
    // resultを取得する。
    const result = findJsonInText("no json");
    expect({ result }).toEqual({ result: null });
  });
});

// isEscapedCharの追加ケースを検証する。
describe("isEscapedChar extra", () => {
  it("非エスケープ位置の結果を確認する", () => {
    // firstを取得する。
    const first = isEscapedChar("a", 0);
    // lastを取得する。
    const last = isEscapedChar("\\", 0);
    expect({ first, last }).toEqual({ first: false, last: false });
  });
});

// findMatchingBracketの追加ケースを検証する。
describe("findMatchingBracket extra array", () => {
  it("配列の閉じ括弧を検出する", () => {
    // textを取得する。
    const text = "[1, [2, 3]] tail";
    // startを取得する。
    const start = text.indexOf("[");
    // endを取得する。
    const end = findMatchingBracket(text, start);
    // expectedを取得する。
    const expected = text.indexOf("]]") + 1;
    expect({ end, expected }).toEqual({ end: expected, expected });
  });
});

// findMatchingBracketの追加ケースを検証する。
describe("findMatchingBracket extra missing", () => {
  it("閉じ括弧が無い場合の結果を確認する", () => {
    // textを取得する。
    const text = "[1, 2";
    // startを取得する。
    const start = text.indexOf("[");
    // endを取得する。
    const end = findMatchingBracket(text, start);
    expect({ end }).toEqual({ end: -1 });
  });
});
