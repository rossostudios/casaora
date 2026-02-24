import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

const CREATE_BTN_RE = /create|add|new|report|crear|reportar/i;

test("maintenance page loads", async ({ page }) => {
  await navigateToModule(page, "maintenance");
  await expect(page.locator("main").first()).toBeVisible();
});

test("maintenance page shows create action", async ({ page }) => {
  await navigateToModule(page, "maintenance");
  const createBtn = page.getByRole("button", { name: CREATE_BTN_RE });
  await expect(createBtn.first()).toBeVisible({ timeout: 5000 });
});
