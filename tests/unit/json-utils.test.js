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

  it("contentが配列でない要素は無視する", () => {
    const result = extractOutputText({
      output: [
        { content: "skip" },
        { content: [{ type: "output_text", text: "ok" }] },
      ],
    });
    expect(result).toBe("ok");
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

  it("フェンス内が不正なら本文中のJSONを解析する", () => {
    const result = parseJsonFromText("```json\n{invalid}\n```\nthen {\"ok\":true}");
    expect(result).toEqual({ ok: true });
  });

  it("JSONが無い場合はnullを返す", () => {
    const result = parseJsonFromText("no json here");
    expect(result).toBeNull();
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

  it("エスケープ済みの引用符を考慮する", () => {
    const text = "{ \"a\": \"value with \\\" quote\" } trailing";
    const start = text.indexOf("{");
    const end = findMatchingBracket(text, start);
    expect(end).toBe(text.indexOf("}", start));
  });

  it("閉じ括弧が無い場合は-1を返す", () => {
    const text = "{ \"a\": 1";
    const start = text.indexOf("{");
    const end = findMatchingBracket(text, start);
    expect(end).toBe(-1);
  });
});

describe("findJsonInText/isEscapedChar", () => {
  it("不正な断片を飛ばして有効なJSONを取得する", () => {
    const result = findJsonInText("{invalid} then {\"ok\":true}");
    expect(result).toEqual({ ok: true });
  });

  it("エスケープ判定を行う", () => {
    expect(isEscapedChar("\\\"", 0)).toBe(true);
    expect(isEscapedChar("\\\"", 1)).toBe(false);
  });
});
