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

// トップページの主要要素が表示される。
test("トップページが表示される", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const heading = page.getByRole("heading", { name: "ライブマップコンソール" });
  const map = page.locator("#map");
  const recommendForm = page.locator("#recommendForm");
  const keyStatus = page.locator("#keyStatus");
  const statusCard = page.locator("#statusCard");
  const mapOverlay = page.locator("#mapOverlay");

  await expect.poll(async () => {
    const keyStatusText = await keyStatus.textContent();
    const statusCardState = await statusCard.getAttribute("data-state");
    const overlayClass = await mapOverlay.getAttribute("class");
    return {
      headingVisible: await heading.isVisible(),
      mapVisible: await map.isVisible(),
      recommendFormVisible: await recommendForm.isVisible(),
      keyStatusText: keyStatusText ? keyStatusText.trim() : "",
      statusCardState: statusCardState || "",
      overlayVisible:
        typeof overlayClass === "string" && overlayClass.includes("visible"),
    };
  }).toEqual({
    headingVisible: true,
    mapVisible: true,
    recommendFormVisible: true,
    keyStatusText: "準備完了",
    statusCardState: "ready",
    overlayVisible: false,
  });
});

// 地域選択の排他制御を確認する。
test("地域選択は排他になる", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const areaSelect = page.locator("#originAreaSelect");
  const regionSelect = page.locator("#originRegionSelect");

  await page.selectOption("#originAreaSelect", "関東地方");
  await page.waitForFunction(() => {
    const area = document.querySelector("#originAreaSelect");
    const region = document.querySelector("#originRegionSelect");
    const areaValue = area ? area.value : "";
    const regionValue = region ? region.value : "";
    return areaValue === "関東地方" && regionValue === "";
  });

  const firstArea = await areaSelect.inputValue();
  const firstRegion = await regionSelect.inputValue();

  await page.selectOption("#originRegionSelect", "東京都");
  await page.waitForFunction(() => {
    const area = document.querySelector("#originAreaSelect");
    const region = document.querySelector("#originRegionSelect");
    const areaValue = area ? area.value : "";
    const regionValue = region ? region.value : "";
    return areaValue === "" && regionValue === "東京都";
  });

  const secondArea = await areaSelect.inputValue();
  const secondRegion = await regionSelect.inputValue();

  expect({ firstArea, firstRegion, secondArea, secondRegion }).toEqual({
    firstArea: "関東地方",
    firstRegion: "",
    secondArea: "",
    secondRegion: "東京都",
  });
});

// 所要時間ヒントの更新を確認する。
test("所要時間のヒントが更新される", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const limitHint = page.locator("#limitHint");

  await page.fill("#maxTimeInput", "45");
  await page.waitForFunction(() => {
    const hint = document.querySelector("#limitHint");
    const text = hint && hint.textContent ? hint.textContent : "";
    return text.includes("45分");
  });
  const firstHint = (await limitHint.textContent()) || "";

  await page.fill("#maxTimeInput", "");
  await page.waitForFunction(() => {
    const hint = document.querySelector("#limitHint");
    const text = hint && hint.textContent ? hint.textContent : "";
    return text.includes("未入力なら制限なし");
  });
  const secondHint = (await limitHint.textContent()) || "";

  expect({
    firstContains: firstHint.includes("45分"),
    secondContains: secondHint.includes("未入力なら制限なし"),
  }).toEqual({
    firstContains: true,
    secondContains: true,
  });
});

// マップクリック後に出発地と目的地が更新されることを確認する。
test("マップクリックで出発地と目的地が更新される", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mapsTest?.map);

  const originLabel = page.locator("#originLabel");
  const destinationLabel = page.locator("#destinationLabel");

  await triggerMapClick(page, 35.681236, 139.767125);
  await triggerMapClick(page, 35.689, 139.692);

  await expect.poll(async () => {
    const originText = (await originLabel.textContent()) || "";
    const destinationText = (await destinationLabel.textContent()) || "";
    return {
      originSelected: originText.trim() !== "未選択",
      destinationSelected: destinationText.trim() !== "未選択",
    };
  }).toEqual({
    originSelected: true,
    destinationSelected: true,
  });
});

// リセット後に初期状態へ戻ることを確認する。
test("リセットで初期状態に戻る", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mapsTest?.map);

  const originLabel = page.locator("#originLabel");
  const destinationLabel = page.locator("#destinationLabel");
  const routeHint = page.locator("#routeHint");

  await triggerMapClick(page, 35.681236, 139.767125);
  await triggerMapClick(page, 35.689, 139.692);
  await page.click("#resetRoute");

  await expect.poll(async () => {
    const originText = (await originLabel.textContent()) || "";
    const destinationText = (await destinationLabel.textContent()) || "";
    const hintText = (await routeHint.textContent()) || "";
    return {
      originReset: originText.trim() === "未選択",
      destinationReset: destinationText.trim() === "未選択",
      hintContains: hintText.includes(
        "マップをクリックして出発地を選択してください"
      ),
    };
  }).toEqual({
    originReset: true,
    destinationReset: true,
    hintContains: true,
  });
});
