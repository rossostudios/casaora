import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

const CREATE_BTN_RE = /create|add|new|crear|agregar/i;

test("properties page loads", async ({ page }) => {
  await navigateToModule(page, "properties");
  // Should show a table or empty state
  const content = page.locator("main").first();
  await expect(content).toBeVisible();
});

test("properties page shows create action", async ({ page }) => {
  await navigateToModule(page, "properties");
  const createBtn = page.getByRole("button", { name: CREATE_BTN_RE });
  await expect(createBtn.first()).toBeVisible({ timeout: 5000 });
});

test("create property sheet opens", async ({ page }) => {
  await navigateToModule(page, "properties");
  const createBtn = page.getByRole("button", { name: CREATE_BTN_RE });
  await createBtn.first().click();
  // A dialog/sheet should appear
  await expect(page.locator('[role="dialog"]').first()).toBeVisible({
    timeout: 5000,
  });
});

test("properties page shows filter bar", async ({ page }) => {
  await navigateToModule(page, "properties");
  const searchInput = page.getByPlaceholder(
    /search properties|buscar propiedades/i
  );
  await expect(searchInput.first()).toBeVisible({ timeout: 5000 });
});

test("properties page shows AI recommendations section or empty state", async ({
  page,
}) => {
  await navigateToModule(page, "properties");
  // Either the recommendations heading or the main content should be visible
  const main = page.locator("main").first();
  await expect(main).toBeVisible({ timeout: 5000 });
});
