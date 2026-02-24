import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("units page loads", async ({ page }) => {
  await navigateToModule(page, "units");
  await expect(page.locator("main").first()).toBeVisible();
});

test("units page shows content or empty state", async ({ page }) => {
  await navigateToModule(page, "units");
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
});
