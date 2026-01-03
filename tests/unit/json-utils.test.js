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
    const direct = extractOutputText({ output_text: "hello" });
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
    const nestedText = "{ \"a\": { \"b\": 1 } } trailing";
    const nestedStart = nestedText.indexOf("{");
    const nestedEnd = findMatchingBracket(nestedText, nestedStart);
    const nestedExpected = nestedText.indexOf("}", nestedText.indexOf("} ") + 1);

    const quotedText = "{ \"a\": \"{ }\" } after";
    const quotedStart = quotedText.indexOf("{");
    const quotedEnd = findMatchingBracket(quotedText, quotedStart);
    const quotedSlice = quotedText.slice(quotedStart, quotedEnd + 1);

    const escapedText = "{ \"a\": \"value with \\\" quote\" } trailing";
    const escapedStart = escapedText.indexOf("{");
    const escapedEnd = findMatchingBracket(escapedText, escapedStart);

    const missingText = "{ \"a\": 1";
    const missingStart = missingText.indexOf("{");
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
    const parsed = findJsonInText("{invalid} then {\"ok\":true}");
    const escapedStart = isEscapedChar("\\\"", 0);
    const escapedNext = isEscapedChar("\\\"", 1);
    expect({ parsed, escapedStart, escapedNext }).toEqual({
      parsed: { ok: true },
      escapedStart: true,
      escapedNext: false,
    });
  });
});
