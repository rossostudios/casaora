import { expect, test } from "@playwright/test";

test("portfolio page loads", async ({ page }) => {
  await page.goto("/app/portfolio");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
});

test("portfolio module page loads", async ({ page }) => {
  await page.goto("/module/portfolio");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
});
