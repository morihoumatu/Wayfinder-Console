/**
 * 非機能の基準を検証する。
 * @file
 */
const { test, expect } = require("@playwright/test");
// playwrightからAxeBuilderを取得する。
const { AxeBuilder } = require("@axe-core/playwright");
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

test.beforeEach(async ({ page }) => {
  await mockGoogleMaps(page);
});

// アクセシビリティ重大違反が発生していないことを確認する。
test("アクセシビリティ重大違反がない", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // 結果を取得する。
  const results = await new AxeBuilder({ page }).analyze();
  // severeを取得する。
  const severe = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact)
  );
  expect(severe).toEqual([]);
});

// ページ読み込み時間が許容範囲に収まることを確認する。
test("ページの読み込み時間が許容範囲", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // timingを取得する。
  const timing = await page.evaluate(() => {
    // entryを取得する。
    const [entry] = performance.getEntriesByType("navigation");
    // 結果を条件で選ぶ。
    const result = entry
      ? {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
          load: entry.loadEventEnd - entry.startTime,
        }
      : null;
    return result;
  });
  // 判定結果を取得する。
  const hasTiming = Boolean(timing);
  // domContentLoadedOkを条件で選ぶ。
  const domContentLoadedOk =
    hasTiming && timing.domContentLoaded < 3000;
  // loadOkを条件で選ぶ。
  const loadOk = hasTiming && timing.load < 5000;
  expect({ hasTiming, domContentLoadedOk, loadOk }).toEqual({
    hasTiming: true,
    domContentLoadedOk: true,
    loadOk: true,
  });
});

// セキュリティヘッダーが付与されることを確認する。
test("セキュリティヘッダーが付与される", async ({ page }) => {
  // レスポンスを取得する。
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  // headersを取得する。
  const headers = response.headers();
  // contentSecurityを条件で選ぶ。
  const contentSecurity = headers["content-security-policy"] || "";
  // checksをまとめる。
  const checks = {
    contentTypeOptions: headers["x-content-type-options"] === "nosniff",
    frameOptions: headers["x-frame-options"] === "DENY",
    referrerPolicy:
      headers["referrer-policy"] === "strict-origin-when-cross-origin",
    permissionsPolicy: headers["permissions-policy"]?.includes("geolocation=()"),
    contentSecurityPolicy: contentSecurity.includes("default-src 'self'"),
    frameAncestors: contentSecurity.includes("frame-ancestors 'none'"),
    crossOriginOpener:
      headers["cross-origin-opener-policy"] === "same-origin",
    crossOriginResource:
      headers["cross-origin-resource-policy"] === "same-origin",
  };
  expect(checks).toEqual({
    contentTypeOptions: true,
    frameOptions: true,
    referrerPolicy: true,
    permissionsPolicy: true,
    contentSecurityPolicy: true,
    frameAncestors: true,
    crossOriginOpener: true,
    crossOriginResource: true,
  });
});
