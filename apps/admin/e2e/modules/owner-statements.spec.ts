import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("owner statements page loads", async ({ page }) => {
  await navigateToModule(page, "owner-statements");
  await expect(page.locator("main").first()).toBeVisible();
});
