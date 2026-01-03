/**
 * Playwrightの画面起動確認を行う。
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

// triggerMapClickの処理を定義する。
const triggerMapClick = async (page, lat, lng) => {
  await page.evaluate(
    (coords) => {
      // マップを用意する。
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

  // headingを取得する。
  const heading = page.getByRole("heading", { name: "ライブマップコンソール" });
  // マップを取得する。
  const map = page.locator("#map");
  // recommendFormを取得する。
  const recommendForm = page.locator("#recommendForm");
  // キーを取得する。
  const keyStatus = page.locator("#keyStatus");
  // 状態を取得する。
  const statusCard = page.locator("#statusCard");
  // マップを取得する。
  const mapOverlay = page.locator("#mapOverlay");

  await expect.poll(async () => {
    // メッセージを取得する。
    const keyStatusText = await keyStatus.textContent();
    // 状態を取得する。
    const statusCardState = await statusCard.getAttribute("data-state");
    // overlayClassを取得する。
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

  // areaSelectを取得する。
  const areaSelect = page.locator("#originAreaSelect");
  // regionSelectを取得する。
  const regionSelect = page.locator("#originRegionSelect");

  await page.selectOption("#originAreaSelect", "関東地方");
  await page.waitForFunction(() => {
    // DOM要素を取得する。
    const area = document.querySelector("#originAreaSelect");
    // DOM要素を取得する。
    const region = document.querySelector("#originRegionSelect");
    // areaValueを条件で選ぶ。
    const areaValue = area ? area.value : "";
    // regionValueを条件で選ぶ。
    const regionValue = region ? region.value : "";
    return areaValue === "関東地方" && regionValue === "";
  });

  // firstAreaを取得する。
  const firstArea = await areaSelect.inputValue();
  // firstRegionを取得する。
  const firstRegion = await regionSelect.inputValue();

  await page.selectOption("#originRegionSelect", "東京都");
  await page.waitForFunction(() => {
    // DOM要素を取得する。
    const area = document.querySelector("#originAreaSelect");
    // DOM要素を取得する。
    const region = document.querySelector("#originRegionSelect");
    // areaValueを条件で選ぶ。
    const areaValue = area ? area.value : "";
    // regionValueを条件で選ぶ。
    const regionValue = region ? region.value : "";
    return areaValue === "" && regionValue === "東京都";
  });

  // secondAreaを取得する。
  const secondArea = await areaSelect.inputValue();
  // secondRegionを取得する。
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

  // limitHintを取得する。
  const limitHint = page.locator("#limitHint");

  await page.fill("#maxTimeInput", "45");
  await page.waitForFunction(() => {
    // DOM要素を取得する。
    const hint = document.querySelector("#limitHint");
    // メッセージを条件で選ぶ。
    const text = hint && hint.textContent ? hint.textContent : "";
    return text.includes("45分");
  });
  // firstHintを条件で選ぶ。
  const firstHint = (await limitHint.textContent()) || "";

  await page.fill("#maxTimeInput", "");
  await page.waitForFunction(() => {
    // DOM要素を取得する。
    const hint = document.querySelector("#limitHint");
    // メッセージを条件で選ぶ。
    const text = hint && hint.textContent ? hint.textContent : "";
    return text.includes("未入力なら制限なし");
  });
  // secondHintを条件で選ぶ。
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

  // originLabelを取得する。
  const originLabel = page.locator("#originLabel");
  // destinationLabelを取得する。
  const destinationLabel = page.locator("#destinationLabel");

  await triggerMapClick(page, 35.681236, 139.767125);
  await triggerMapClick(page, 35.689, 139.692);

  await expect.poll(async () => {
    // メッセージを条件で選ぶ。
    const originText = (await originLabel.textContent()) || "";
    // メッセージを条件で選ぶ。
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

  // originLabelを取得する。
  const originLabel = page.locator("#originLabel");
  // destinationLabelを取得する。
  const destinationLabel = page.locator("#destinationLabel");
  // routeHintを取得する。
  const routeHint = page.locator("#routeHint");

  await triggerMapClick(page, 35.681236, 139.767125);
  await triggerMapClick(page, 35.689, 139.692);
  await page.click("#resetRoute");

  await expect.poll(async () => {
    // メッセージを条件で選ぶ。
    const originText = (await originLabel.textContent()) || "";
    // メッセージを条件で選ぶ。
    const destinationText = (await destinationLabel.textContent()) || "";
    // メッセージを条件で選ぶ。
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
