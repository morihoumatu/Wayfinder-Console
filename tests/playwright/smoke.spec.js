/**
 * Playwrightの画面起動確認を行う。
 * @file
 */
const { test, expect } = require("@playwright/test");

test("トップページが表示される", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const heading = page.getByRole("heading", { name: "ライブマップコンソール" });
  await expect(heading).toBeVisible();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#recommendForm")).toBeVisible();
});
