import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("agent config page loads", async ({ page }) => {
  await navigateToModule(page, "agent-config");
  await expect(page.locator("main").first()).toBeVisible();
});

test("agent config shows agent list", async ({ page }) => {
  await navigateToModule(page, "agent-config");
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
});
