/**
 * APIハンドラーの挙動を検証する。
 * @file
 */
const openaiClient = require("../../server/openai-client");
const callOpenAISpy = vi.spyOn(openaiClient, "callOpenAI");
const {
  handleRecommendResult,
  handleSpotResult,
  handleWalkRouteResult,
  handleRecommendPayload,
} = require("../../server/handlers");

const createSender = () => {
  /** @type {{ status: number, body: any }[]} */
  const calls = [];
  const sendOnce = (status, body) => {
    calls.push({ status, body });
  };
  return { calls, sendOnce };
};

describe("handleRecommendResult", () => {
  it("解析失敗時にエラーを返す", () => {
    const { calls, sendOnce } = createSender();
    handleRecommendResult({
      outputText: "invalid",
      isWalkRoute: false,
      originRegion: "",
      effectiveTargetMinutes: 60,
      sendOnce,
    });
    expect(calls[0].status).toBe(500);
  });

  it("OpenAIエラーを返す", () => {
    const { calls, sendOnce } = createSender();
    handleRecommendResult({
      outputText: "{\"error\":\"oops\"}",
      isWalkRoute: false,
      originRegion: "",
      effectiveTargetMinutes: 60,
      sendOnce,
    });
    expect(calls[0].body.error).toBe("oops");
  });
});

describe("handleWalkRouteResult/handleSpotResult", () => {
  it("散歩ルートの立ち寄りが不足する場合はエラー", () => {
    const { calls, sendOnce } = createSender();
    handleWalkRouteResult({
      result: { route_name: "walk", stops: [{ name: "A", address: "X" }] },
      originRegion: "東京都",
      effectiveTargetMinutes: 60,
      outputText: "{}",
      sendOnce,
    });
    expect(calls[0].status).toBe(500);
  });

  it("スポット結果を送信する", () => {
    const { calls, sendOnce } = createSender();
    handleSpotResult(
      {
        place_name: "Cafe",
        place_address: "Tokyo",
        reason: "Good",
        source_urls: [],
      },
      sendOnce
    );
    expect(calls[0].status).toBe(200);
    expect(calls[0].body.place.name).toBe("Cafe");
  });
});

describe("handleRecommendPayload", () => {
  afterEach(() => {
    callOpenAISpy.mockReset();
  });

  it("正常レスポンスを返す", async () => {
    callOpenAISpy.mockResolvedValue({
      output_text:
        "{\"place_name\":\"Spot\",\"place_address\":\"Tokyo\",\"reason\":\"Ok\",\"source_urls\":[]}",
    });
    const { calls, sendOnce } = createSender();
    await handleRecommendPayload(
      { query: "cafe", origin: { lat: 1, lng: 2 } },
      sendOnce
    );
    expect(calls[0].status).toBe(200);
  });
});
