import { expect, test } from "@playwright/test";

test("team settings page loads", async ({ page }) => {
  await page.goto("/settings/team");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
});
