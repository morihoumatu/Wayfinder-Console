/**
 * おすすめ検索のフローを検証する。
 * @file
 */
const { test, expect } = require("@playwright/test");
const { getGoogleMapsStubScript } = require("../helpers/google-maps-stub");

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

  const result = page.locator("#recommendResult");
  const title = page.locator("#recommendTitle");
  const address = page.locator("#recommendAddress");
  const reason = page.locator("#recommendReason");
  const stopsSection = page.locator("#recommendStopsSection");
  const stops = page.locator("#recommendStops li");
  const mapLink = page.locator("#recommendMapLink");

  await expect.poll(async () => {
    const titleText = (await title.textContent()) || "";
    const addressText = (await address.textContent()) || "";
    const reasonText = (await reason.textContent()) || "";
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
