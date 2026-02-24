import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("notification rules page loads", async ({ page }) => {
  await navigateToModule(page, "notification-rules");
  await expect(page.locator("main").first()).toBeVisible();
});
