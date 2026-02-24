import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("sequences page loads", async ({ page }) => {
  await navigateToModule(page, "sequences");
  await expect(page.locator("main").first()).toBeVisible();
});
