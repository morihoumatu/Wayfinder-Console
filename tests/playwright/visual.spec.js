/**
 * ビジュアル回帰の基準を検証する。
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

test.beforeEach(async ({ page }) => {
  await mockGoogleMaps(page);
});

// トップページのビジュアル崩れを検知する。
test("トップページのビジュアルが崩れていない", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mapsTest?.map);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("home.png", {
    fullPage: true,
  });
});
