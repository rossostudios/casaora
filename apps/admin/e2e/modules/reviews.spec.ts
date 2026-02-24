import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("reviews page loads", async ({ page }) => {
  await navigateToModule(page, "reviews");
  await expect(page.locator("main").first()).toBeVisible();
});
