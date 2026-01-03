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

const triggerMapClick = async (page, lat, lng) => {
  await page.evaluate(
    (coords) => {
      const map = window.__mapsTest?.map;
      if (map && typeof map.__trigger === "function") {
        map.__trigger("click", {
          latLng: new google.maps.LatLng(coords.lat, coords.lng),
        });
      }
    },
    { lat, lng }
  );
};

test.beforeEach(async ({ page }) => {
  await mockGoogleMaps(page);
});

test.setTimeout(60_000);

test("トップページが表示される", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const heading = page.getByRole("heading", { name: "ライブマップコンソール" });
  await expect(heading).toBeVisible();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#recommendForm")).toBeVisible();
  await expect(page.locator("#keyStatus")).toHaveText("準備完了");
  await expect(page.locator("#statusCard")).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#mapOverlay")).not.toHaveClass(/visible/);
});

test("地域選択は排他になる", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.selectOption("#originAreaSelect", "関東地方");
  await expect(page.locator("#originAreaSelect")).toHaveValue("関東地方");
  await expect(page.locator("#originRegionSelect")).toHaveValue("");

  await page.selectOption("#originRegionSelect", "東京都");
  await expect(page.locator("#originRegionSelect")).toHaveValue("東京都");
  await expect(page.locator("#originAreaSelect")).toHaveValue("");
});

test("所要時間のヒントが更新される", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.fill("#maxTimeInput", "45");
  await expect(page.locator("#limitHint")).toContainText("45分");

  await page.fill("#maxTimeInput", "");
  await expect(page.locator("#limitHint")).toContainText("未入力なら制限なし");
});

test("マップクリックで出発地と目的地が更新される", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mapsTest?.map);

  await triggerMapClick(page, 35.681236, 139.767125);
  await expect(page.locator("#originLabel")).not.toHaveText("未選択");

  await triggerMapClick(page, 35.689, 139.692);
  await expect(page.locator("#destinationLabel")).not.toHaveText("未選択");
});

test("リセットで初期状態に戻る", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mapsTest?.map);

  await triggerMapClick(page, 35.681236, 139.767125);
  await triggerMapClick(page, 35.689, 139.692);
  await page.click("#resetRoute");

  await expect(page.locator("#originLabel")).toHaveText("未選択");
  await expect(page.locator("#destinationLabel")).toHaveText("未選択");
  await expect(page.locator("#routeHint")).toContainText(
    "マップをクリックして出発地を選択してください"
  );
});
