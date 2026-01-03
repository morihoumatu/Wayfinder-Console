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

  await expect(page.locator("#recommendResult")).toBeVisible();
  await expect(page.locator("#recommendTitle")).toHaveText("新宿御苑");
  await expect(page.locator("#recommendAddress")).toContainText("東京都新宿区");
  await expect(page.locator("#recommendReason")).toContainText("散策");
  await expect(page.locator("#recommendStopsSection")).toBeVisible();
  await expect(page.locator("#recommendStops li")).toHaveCount(2);
  await expect(page.locator("#recommendMapLink")).toHaveAttribute(
    "href",
    /google\.com\/maps/
  );
});

test("出発地が無い場合はヒントを表示する", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.fill("#recommendQuery", "カフェ");
  await page.click("#recommendButton");

  await expect(page.locator("#recommendHint")).toContainText("出発地");
});
