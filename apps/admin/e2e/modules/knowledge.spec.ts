import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("knowledge base page loads", async ({ page }) => {
  await navigateToModule(page, "knowledge");
  await expect(page.locator("main").first()).toBeVisible();
});
