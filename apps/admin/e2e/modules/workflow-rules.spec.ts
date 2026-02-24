import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("workflow rules page loads", async ({ page }) => {
  await navigateToModule(page, "workflow-rules");
  await expect(page.locator("main").first()).toBeVisible();
});
