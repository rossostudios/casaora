import { expect, test } from "@playwright/test";

test("sidebar navigation renders", async ({ page }) => {
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
  // The sidebar/navigation should have links
  await expect(page.locator("nav").first()).toBeVisible();
});

test("can navigate to a module page", async ({ page }) => {
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  await page.goto("/module/properties");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible();
});

test("settings pages are accessible", async ({ page }) => {
  await page.goto("/settings/organization");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible();
});
