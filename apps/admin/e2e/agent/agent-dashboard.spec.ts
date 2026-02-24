import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("agent dashboard page loads", async ({ page }) => {
  await navigateToModule(page, "agent-dashboard");
  await expect(page.locator("main").first()).toBeVisible();
});
