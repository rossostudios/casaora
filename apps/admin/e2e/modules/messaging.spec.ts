import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("messaging page loads", async ({ page }) => {
  await navigateToModule(page, "messaging");
  await expect(page.locator("main").first()).toBeVisible();
});
