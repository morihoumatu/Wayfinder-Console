/**
 * 非機能の基準を検証する。
 * @file
 */
const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");
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

// アクセシビリティ重大違反が発生していないことを確認する。
test("アクセシビリティ重大違反がない", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const results = await new AxeBuilder({ page }).analyze();
  const severe = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact)
  );
  expect(severe).toEqual([]);
});

// ページ読み込み時間が許容範囲に収まることを確認する。
test("ページの読み込み時間が許容範囲", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const timing = await page.evaluate(() => {
    const [entry] = performance.getEntriesByType("navigation");
    const result = entry
      ? {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
          load: entry.loadEventEnd - entry.startTime,
        }
      : null;
    return result;
  });
  const hasTiming = Boolean(timing);
  const domContentLoadedOk =
    hasTiming && timing.domContentLoaded < 3000;
  const loadOk = hasTiming && timing.load < 5000;
  expect({ hasTiming, domContentLoadedOk, loadOk }).toEqual({
    hasTiming: true,
    domContentLoadedOk: true,
    loadOk: true,
  });
});

// セキュリティヘッダーが付与されることを確認する。
test("セキュリティヘッダーが付与される", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  const headers = response.headers();
  const contentSecurity = headers["content-security-policy"] || "";
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
