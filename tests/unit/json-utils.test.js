/**
 * JSONユーティリティの挙動を検証する。
 * @file
 */
const {
  extractOutputText,
  parseJsonFromText,
  findMatchingBracket,
} = require("../../server/json-utils");

describe("extractOutputText", () => {
  it("output_textがある場合はそのまま返す", () => {
    const result = extractOutputText({ output_text: "hello" });
    expect(result).toBe("hello");
  });

  it("output配列からテキストを連結する", () => {
    const result = extractOutputText({
      output: [
        {
          content: [
            { type: "output_text", text: "first" },
            { type: "text", text: "second" },
          ],
        },
      ],
    });
    expect(result).toBe("first\nsecond");
  });
});

describe("parseJsonFromText", () => {
  it("JSON文字列を解析する", () => {
    const result = parseJsonFromText('{"ok":true}');
    expect(result).toEqual({ ok: true });
  });

  it("フェンス付きJSONを解析する", () => {
    const result = parseJsonFromText("```json\n{\"value\":1}\n```");
    expect(result).toEqual({ value: 1 });
  });

  it("本文中のJSON断片を解析する", () => {
    const result = parseJsonFromText("note: {\"a\":\"b\"} end");
    expect(result).toEqual({ a: "b" });
  });
});

describe("findMatchingBracket", () => {
  it("ネストした括弧の終端を見つける", () => {
    const text = "{ \"a\": { \"b\": 1 } } trailing";
    const start = text.indexOf("{");
    const end = findMatchingBracket(text, start);
    expect(end).toBe(text.indexOf("}", text.indexOf("} ") + 1));
  });

  it("文字列内の括弧は無視する", () => {
    const text = "{ \"a\": \"{ }\" } after";
    const start = text.indexOf("{");
    const end = findMatchingBracket(text, start);
    expect(text.slice(start, end + 1)).toBe("{ \"a\": \"{ }\" }");
  });
});
