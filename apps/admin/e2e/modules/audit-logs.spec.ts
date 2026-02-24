import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("audit logs page loads", async ({ page }) => {
  await navigateToModule(page, "audit-logs");
  await expect(page.locator("main").first()).toBeVisible();
});
