import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("calendar page loads", async ({ page }) => {
  await navigateToModule(page, "calendar");
  await expect(page.locator("main").first()).toBeVisible();
});
