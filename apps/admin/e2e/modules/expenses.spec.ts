import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("expenses page loads", async ({ page }) => {
  await navigateToModule(page, "expenses");
  await expect(page.locator("main").first()).toBeVisible();
});
