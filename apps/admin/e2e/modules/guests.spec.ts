import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("guests page loads", async ({ page }) => {
  await navigateToModule(page, "guests");
  await expect(page.locator("main").first()).toBeVisible();
});
