import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("collections page loads", async ({ page }) => {
  await navigateToModule(page, "collections");
  await expect(page.locator("main").first()).toBeVisible();
});
