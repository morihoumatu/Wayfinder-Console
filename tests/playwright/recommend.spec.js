/**
 * おすすめ検索のフローを検証する。
 * @file
 */
const { test, expect } = require("@playwright/test");
// google-maps-stubからgetGoogleMapsStubScriptを取得する。
const { getGoogleMapsStubScript } = require("../helpers/google-maps-stub");

// mockGoogleMapsの処理を定義する。
const mockGoogleMaps = async (page) => {
  await page.route(
    /https:\/\/maps\.googleapis\.com\/maps\/api\/js.*/,
    async (route) => {
      await route.fulfill({
        contentType: "application/javascript",
        body: getGoogleMapsStubScript(),
      });
    }
  );
};

// mockRecommendApiの処理を定義する。
const mockRecommendApi = async (page) => {
  await page.route("**/api/recommend", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        place: {
          name: "新宿御苑",
          address: "東京都新宿区内藤町",
          reason: "季節の散策に最適な公園です。",
          sources: ["https://example.com"],
          stops: [
            { name: "入口", address: "東京都新宿区" },
            { name: "中央広場", address: "東京都新宿区" },
          ],
        },
      }),
    });
  });
};

test.beforeEach(async ({ page }) => {
  await mockGoogleMaps(page);
});

// おすすめ検索結果が表示されることを確認する。
test("おすすめ検索が結果を表示する", async ({ page }) => {
  await mockRecommendApi(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mapsTest?.map);
  await page.evaluate(() => {
    window.calculateRoutes = () => {};
    window.setOrigin({ lat: 35.681236, lng: 139.767125 }, "東京都");
  });

  await page.fill("#recommendQuery", "景色の良い公園");
  await page.click("#recommendButton");

  // 結果を取得する。
  const result = page.locator("#recommendResult");
  // titleを取得する。
  const title = page.locator("#recommendTitle");
  // addressを取得する。
  const address = page.locator("#recommendAddress");
  // reasonを取得する。
  const reason = page.locator("#recommendReason");
  // stopsSectionを取得する。
  const stopsSection = page.locator("#recommendStopsSection");
  // stopsを取得する。
  const stops = page.locator("#recommendStops li");
  // マップを取得する。
  const mapLink = page.locator("#recommendMapLink");

  await expect.poll(async () => {
    // メッセージを条件で選ぶ。
    const titleText = (await title.textContent()) || "";
    // メッセージを条件で選ぶ。
    const addressText = (await address.textContent()) || "";
    // メッセージを条件で選ぶ。
    const reasonText = (await reason.textContent()) || "";
    // hrefを取得する。
    const href = await mapLink.getAttribute("href");
    return {
      resultVisible: await result.isVisible(),
      titleText: titleText.trim(),
      addressContains: addressText.includes("東京都新宿区"),
      reasonContains: reasonText.includes("散策"),
      stopsVisible: await stopsSection.isVisible(),
      stopCount: await stops.count(),
      mapLinkValid: typeof href === "string" && /google\.com\/maps/.test(href),
    };
  }).toEqual({
    resultVisible: true,
    titleText: "新宿御苑",
    addressContains: true,
    reasonContains: true,
    stopsVisible: true,
    stopCount: 2,
    mapLinkValid: true,
  });
});

// 出発地未指定時にヒントが表示されることを確認する。
test("出発地が無い場合はヒントを表示する", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.fill("#recommendQuery", "カフェ");
  await page.click("#recommendButton");

  await expect(page.locator("#recommendHint")).toContainText("出発地");
});
