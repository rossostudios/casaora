import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("voice interactions page loads", async ({ page }) => {
  await navigateToModule(page, "voice");
  await expect(page.locator("main").first()).toBeVisible();
});
