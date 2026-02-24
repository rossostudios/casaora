import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("documents page loads", async ({ page }) => {
  await navigateToModule(page, "documents");
  await expect(page.locator("main").first()).toBeVisible();
});
