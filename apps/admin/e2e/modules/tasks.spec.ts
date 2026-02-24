import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("tasks page loads", async ({ page }) => {
  await navigateToModule(page, "tasks");
  await expect(page.locator("main").first()).toBeVisible();
});
