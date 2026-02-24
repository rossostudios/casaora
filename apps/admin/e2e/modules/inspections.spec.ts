import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("inspections page loads", async ({ page }) => {
  await navigateToModule(page, "inspections");
  await expect(page.locator("main").first()).toBeVisible();
});
