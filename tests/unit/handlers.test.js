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

  it("散歩ルート結果を返す", () => {
    const { calls, sendOnce } = createSender();
    const outputText = JSON.stringify({
      route_name: "散歩ルート",
      area: "",
      reason: "test",
      target_minutes: 0,
      stops: [
        { name: "A", address: "Tokyo" },
        { name: "B", address: "Tokyo" },
      ],
      source_urls: [],
    });
    handleRecommendResult({
      outputText,
      isWalkRoute: true,
      originRegion: "東京都",
      effectiveTargetMinutes: 45,
      sendOnce,
    });
    expect(calls[0].status).toBe(200);
    expect(calls[0].body.place.route_type).toBe("walk_multi");
    expect(calls[0].body.place.area).toBe("東京都");
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

  it("散歩ルート結果を送信する(指定時間を採用)", () => {
    const { calls, sendOnce } = createSender();
    handleWalkRouteResult({
      result: {
        route_name: "Walk",
        area: "東京",
        reason: "Good",
        target_minutes: "40",
        stops: [
          { name: "A", address: "Tokyo" },
          { name: "B", address: "Tokyo" },
        ],
        source_urls: [{ title: "A", url: "https://example.com" }],
      },
      originRegion: "東京都",
      effectiveTargetMinutes: 30,
      outputText: "{}",
      sendOnce,
    });
    expect(calls[0].status).toBe(200);
    expect(calls[0].body.place.name).toBe("Walk");
    expect(calls[0].body.place.target_minutes).toBe(40);
    expect(calls[0].body.place.sources.length).toBe(1);
  });

  it("散歩ルート結果の目標時間をフォールバックする", () => {
    const { calls, sendOnce } = createSender();
    handleWalkRouteResult({
      result: {
        reason: "Fallback",
        target_minutes: "invalid",
        stops: [
          { name: "A", address: "Tokyo" },
          { name: "B", address: "Tokyo" },
        ],
        source_urls: "none",
      },
      originRegion: "東京都",
      effectiveTargetMinutes: 55,
      outputText: "{}",
      sendOnce,
    });
    expect(calls[0].body.place.name).toBe("おすすめ散歩ルート");
    expect(calls[0].body.place.area).toBe("東京都");
    expect(calls[0].body.place.target_minutes).toBe(55);
    expect(calls[0].body.place.sources).toEqual([]);
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

  it("スポット結果の参照が配列以外なら空配列になる", () => {
    const { calls, sendOnce } = createSender();
    handleSpotResult(
      {
        place_name: "Spot",
        place_address: "Tokyo",
        reason: "Info",
        source_urls: "none",
      },
      sendOnce
    );
    expect(calls[0].body.place.sources).toEqual([]);
  });
});

describe("handleRecommendPayload", () => {
  afterEach(() => {
    callOpenAISpy.mockReset();
  });

  it("入力が不正ならAPIを呼ばない", async () => {
    const { calls, sendOnce } = createSender();
    await handleRecommendPayload(
      { query: "", origin: { lat: 1, lng: 2 } },
      sendOnce
    );
    expect(calls[0].status).toBe(400);
    expect(callOpenAISpy).not.toHaveBeenCalled();
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

  it("散歩ルートのレスポンスを返す", async () => {
    callOpenAISpy.mockResolvedValue({
      output_text: JSON.stringify({
        route_name: "Walk",
        area: "東京",
        reason: "Nice",
        target_minutes: 45,
        stops: [
          { name: "A", address: "Tokyo" },
          { name: "B", address: "Tokyo" },
        ],
        source_urls: [],
      }),
    });
    const { calls, sendOnce } = createSender();
    await handleRecommendPayload(
      { query: "", mode: "walk_route", origin: { lat: 1, lng: 2 } },
      sendOnce
    );
    expect(calls[0].body.place.route_type).toBe("walk_multi");
  });
});
