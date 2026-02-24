import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("billing page loads", async ({ page }) => {
  await navigateToModule(page, "billing");
  await expect(page.locator("main").first()).toBeVisible();
});
