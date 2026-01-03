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

// handleRecommendResultの結果をまとめて検証する。
describe("handleRecommendResult", () => {
  it("入力パターンごとの応答をまとめて確認する", () => {
    const invalid = createSender();
    handleRecommendResult({
      outputText: "invalid",
      isWalkRoute: false,
      originRegion: "",
      effectiveTargetMinutes: 60,
      sendOnce: invalid.sendOnce,
    });

    const errorCase = createSender();
    handleRecommendResult({
      outputText: "{\"error\":\"oops\"}",
      isWalkRoute: false,
      originRegion: "",
      effectiveTargetMinutes: 60,
      sendOnce: errorCase.sendOnce,
    });

    const walkCase = createSender();
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
      sendOnce: walkCase.sendOnce,
    });

    expect({
      invalidStatus: invalid.calls[0].status,
      errorMessage: errorCase.calls[0].body.error,
      walk: {
        status: walkCase.calls[0].status,
        routeType: walkCase.calls[0].body.place.route_type,
        area: walkCase.calls[0].body.place.area,
      },
    }).toEqual({
      invalidStatus: 500,
      errorMessage: "oops",
      walk: {
        status: 200,
        routeType: "walk_multi",
        area: "東京都",
      },
    });
  });
});

// handleWalkRouteResultとhandleSpotResultの結果をまとめて検証する。
describe("handleWalkRouteResult/handleSpotResult", () => {
  it("散歩ルートとスポットの応答をまとめて確認する", () => {
    const insufficient = createSender();
    handleWalkRouteResult({
      result: { route_name: "walk", stops: [{ name: "A", address: "X" }] },
      originRegion: "東京都",
      effectiveTargetMinutes: 60,
      outputText: "{}",
      sendOnce: insufficient.sendOnce,
    });

    const byTarget = createSender();
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
      sendOnce: byTarget.sendOnce,
    });

    const fallback = createSender();
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
      sendOnce: fallback.sendOnce,
    });

    const spot = createSender();
    handleSpotResult(
      {
        place_name: "Cafe",
        place_address: "Tokyo",
        reason: "Good",
        source_urls: [],
      },
      spot.sendOnce
    );

    const spotFallback = createSender();
    handleSpotResult(
      {
        place_name: "Spot",
        place_address: "Tokyo",
        reason: "Info",
        source_urls: "none",
      },
      spotFallback.sendOnce
    );

    expect({
      insufficientStatus: insufficient.calls[0].status,
      byTarget: {
        status: byTarget.calls[0].status,
        name: byTarget.calls[0].body.place.name,
        minutes: byTarget.calls[0].body.place.target_minutes,
        sources: byTarget.calls[0].body.place.sources.length,
      },
      fallback: {
        name: fallback.calls[0].body.place.name,
        area: fallback.calls[0].body.place.area,
        minutes: fallback.calls[0].body.place.target_minutes,
        sources: fallback.calls[0].body.place.sources,
      },
      spot: {
        status: spot.calls[0].status,
        name: spot.calls[0].body.place.name,
      },
      spotFallback: {
        sources: spotFallback.calls[0].body.place.sources,
      },
    }).toEqual({
      insufficientStatus: 500,
      byTarget: {
        status: 200,
        name: "Walk",
        minutes: 40,
        sources: 1,
      },
      fallback: {
        name: "おすすめ散歩ルート",
        area: "東京都",
        minutes: 55,
        sources: [],
      },
      spot: {
        status: 200,
        name: "Cafe",
      },
      spotFallback: {
        sources: [],
      },
    });
  });
});

// handleRecommendPayloadの入力検証と応答をまとめて検証する。
describe("handleRecommendPayload", () => {
  afterEach(() => {
    callOpenAISpy.mockReset();
  });

  it("入力検証とレスポンスをまとめて確認する", async () => {
    callOpenAISpy.mockReset();
    const invalid = createSender();
    await handleRecommendPayload(
      { query: "", origin: { lat: 1, lng: 2 } },
      invalid.sendOnce
    );
    const invalidResult = {
      status: invalid.calls[0].status,
      callCount: callOpenAISpy.mock.calls.length,
    };

    callOpenAISpy.mockReset();
    callOpenAISpy.mockResolvedValue({
      output_text:
        "{\"place_name\":\"Spot\",\"place_address\":\"Tokyo\",\"reason\":\"Ok\",\"source_urls\":[]}",
    });
    const normal = createSender();
    await handleRecommendPayload(
      { query: "cafe", origin: { lat: 1, lng: 2 } },
      normal.sendOnce
    );

    callOpenAISpy.mockReset();
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
    const walk = createSender();
    await handleRecommendPayload(
      { query: "", mode: "walk_route", origin: { lat: 1, lng: 2 } },
      walk.sendOnce
    );

    expect({
      invalid: invalidResult,
      normalStatus: normal.calls[0].status,
      walkRouteType: walk.calls[0].body.place.route_type,
    }).toEqual({
      invalid: { status: 400, callCount: 0 },
      normalStatus: 200,
      walkRouteType: "walk_multi",
    });
  });
});
