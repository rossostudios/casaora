import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

const CREATE_BTN_RE = /create|add|new|crear|agregar/i;

test("reservations page loads", async ({ page }) => {
  await navigateToModule(page, "reservations");
  await expect(page.locator("main").first()).toBeVisible();
});

test("reservations page shows create action", async ({ page }) => {
  await navigateToModule(page, "reservations");
  const createBtn = page.getByRole("button", { name: CREATE_BTN_RE });
  await expect(createBtn.first()).toBeVisible({ timeout: 5000 });
});
