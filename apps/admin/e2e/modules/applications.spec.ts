import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("applications page loads", async ({ page }) => {
  await navigateToModule(page, "applications");
  await expect(page.locator("main").first()).toBeVisible();
});
