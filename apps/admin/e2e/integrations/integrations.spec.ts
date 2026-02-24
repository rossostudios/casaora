import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

test("integrations page loads", async ({ page }) => {
  await navigateToModule(page, "integrations");
  await expect(page.locator("main").first()).toBeVisible();
});

test("integrations page renders without errors", async ({ page }) => {
  await navigateToModule(page, "integrations");
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
});
