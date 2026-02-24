import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("pricing page loads", async ({ page }) => {
  await navigateToModule(page, "pricing");
  await expect(page.locator("main").first()).toBeVisible();
});
