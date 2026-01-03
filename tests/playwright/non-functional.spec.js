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

test("アクセシビリティ重大違反がない", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const results = await new AxeBuilder({ page }).analyze();
  const severe = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact)
  );
  expect(severe).toEqual([]);
});

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
  expect(timing).not.toBeNull();
  expect(timing.domContentLoaded).toBeLessThan(3000);
  expect(timing.load).toBeLessThan(5000);
});

test("セキュリティヘッダーが付与される", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
});
