/**
 * JSONユーティリティの挙動を検証する。
 * @file
 */
const {
  extractOutputText,
  parseJsonFromText,
  findJsonInText,
  isEscapedChar,
  findMatchingBracket,
} = require("../../server/json-utils");

// extractOutputTextの挙動をまとめて検証する。
describe("extractOutputText", () => {
  it("出力テキストの抽出結果をまとめて確認する", () => {
    // directを取得する。
    const direct = extractOutputText({ output_text: "hello" });
    // joinedを取得する。
    const joined = extractOutputText({
      output: [
        {
          content: [
            { type: "output_text", text: "first" },
            { type: "text", text: "second" },
          ],
        },
      ],
    });
    // filteredを取得する。
    const filtered = extractOutputText({
      output: [
        { content: "skip" },
        { content: [{ type: "output_text", text: "ok" }] },
      ],
    });
    expect({ direct, joined, filtered }).toEqual({
      direct: "hello",
      joined: "first\nsecond",
      filtered: "ok",
    });
  });
});

// parseJsonFromTextの挙動をまとめて検証する。
describe("parseJsonFromText", () => {
  it("JSON抽出の結果をまとめて確認する", () => {
    // parsedをまとめる。
    const parsed = {
      plain: parseJsonFromText('{"ok":true}'),
      fenced: parseJsonFromText("```json\n{\"value\":1}\n```"),
      inline: parseJsonFromText("note: {\"a\":\"b\"} end"),
      fallback: parseJsonFromText("```json\n{invalid}\n```\nthen {\"ok\":true}"),
      missing: parseJsonFromText("no json here"),
    };
    expect(parsed).toEqual({
      plain: { ok: true },
      fenced: { value: 1 },
      inline: { a: "b" },
      fallback: { ok: true },
      missing: null,
    });
  });
});

// findMatchingBracketの挙動をまとめて検証する。
describe("findMatchingBracket", () => {
  it("括弧探索の結果をまとめて確認する", () => {
    // メッセージの初期値を定義する。
    const nestedText = "{ \"a\": { \"b\": 1 } } trailing";
    // nestedStartを取得する。
    const nestedStart = nestedText.indexOf("{");
    // nestedEndを取得する。
    const nestedEnd = findMatchingBracket(nestedText, nestedStart);
    // nestedExpectedを取得する。
    const nestedExpected = nestedText.indexOf("}", nestedText.indexOf("} ") + 1);

    // メッセージの初期値を定義する。
    const quotedText = "{ \"a\": \"{ }\" } after";
    // quotedStartを取得する。
    const quotedStart = quotedText.indexOf("{");
    // quotedEndを取得する。
    const quotedEnd = findMatchingBracket(quotedText, quotedStart);
    // quotedSliceを取得する。
    const quotedSlice = quotedText.slice(quotedStart, quotedEnd + 1);

    // メッセージの初期値を定義する。
    const escapedText = "{ \"a\": \"value with \\\" quote\" } trailing";
    // escapedStartを取得する。
    const escapedStart = escapedText.indexOf("{");
    // escapedEndを取得する。
    const escapedEnd = findMatchingBracket(escapedText, escapedStart);

    // メッセージの初期値を定義する。
    const missingText = "{ \"a\": 1";
    // missingStartを取得する。
    const missingStart = missingText.indexOf("{");
    // missingEndを取得する。
    const missingEnd = findMatchingBracket(missingText, missingStart);

    expect({
      nestedEnd,
      nestedExpected,
      quotedSlice,
      escapedEnd,
      escapedExpected: escapedText.indexOf("}", escapedStart),
      missingEnd,
    }).toEqual({
      nestedEnd: nestedExpected,
      nestedExpected,
      quotedSlice: "{ \"a\": \"{ }\" }",
      escapedEnd: escapedText.indexOf("}", escapedStart),
      escapedExpected: escapedText.indexOf("}", escapedStart),
      missingEnd: -1,
    });
  });
});

// findJsonInText/isEscapedCharの挙動をまとめて検証する。
describe("findJsonInText/isEscapedChar", () => {
  it("JSON抽出とエスケープ判定をまとめて確認する", () => {
    // parsedを取得する。
    const parsed = findJsonInText("{invalid} then {\"ok\":true}");
    // escapedStartを取得する。
    const escapedStart = isEscapedChar("\\\"", 0);
    // escapedNextを取得する。
    const escapedNext = isEscapedChar("\\\"", 1);
    expect({ parsed, escapedStart, escapedNext }).toEqual({
      parsed: { ok: true },
      escapedStart: true,
      escapedNext: false,
    });
  });
});
