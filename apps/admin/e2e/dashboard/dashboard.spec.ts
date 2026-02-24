import { expect, test } from "@playwright/test";

test("dashboard loads", async ({ page }) => {
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
});

test("dashboard displays content without errors", async ({ page }) => {
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  // No Next.js error overlay should be present
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
});

test("dashboard has navigation elements", async ({ page }) => {
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("nav").first()).toBeVisible();
});
