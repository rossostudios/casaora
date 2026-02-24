import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("automations/playbooks page loads", async ({ page }) => {
  await navigateToModule(page, "automations");
  await expect(page.locator("main").first()).toBeVisible();
});
