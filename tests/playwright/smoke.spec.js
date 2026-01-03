/**
 * Playwrightの画面起動確認を行う。
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

test("トップページが表示される", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  const heading = page.getByRole("heading", { name: "ライブマップコンソール" });
  await expect(heading).toBeVisible();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#recommendForm")).toBeVisible();
  await expect(page.locator("#keyStatus")).toHaveText("準備完了");
  await expect(page.locator("#statusCard")).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#mapOverlay")).not.toHaveClass(/visible/);
});

test("地域選択は排他になる", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  await page.selectOption("#originAreaSelect", "関東地方");
  await expect(page.locator("#originAreaSelect")).toHaveValue("関東地方");
  await expect(page.locator("#originRegionSelect")).toHaveValue("");

  await page.selectOption("#originRegionSelect", "東京都");
  await expect(page.locator("#originRegionSelect")).toHaveValue("東京都");
  await expect(page.locator("#originAreaSelect")).toHaveValue("");
});

test("所要時間のヒントが更新される", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  await page.fill("#maxTimeInput", "45");
  await expect(page.locator("#limitHint")).toContainText("45分");

  await page.fill("#maxTimeInput", "");
  await expect(page.locator("#limitHint")).toContainText("未入力なら制限なし");
});
