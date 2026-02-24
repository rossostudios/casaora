import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("leases page loads", async ({ page }) => {
  await navigateToModule(page, "leases");
  await expect(page.locator("main").first()).toBeVisible();
});

test("leases page renders without errors", async ({ page }) => {
  await navigateToModule(page, "leases");
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
});
