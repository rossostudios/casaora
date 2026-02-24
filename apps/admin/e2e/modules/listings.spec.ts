import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("listings page loads", async ({ page }) => {
  await navigateToModule(page, "listings");
  await expect(page.locator("main").first()).toBeVisible();
});
