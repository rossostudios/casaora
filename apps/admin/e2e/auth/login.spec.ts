import { expect, test } from "@playwright/test";

const SIGN_IN_RE = /sign in|iniciar/i;

test.use({ storageState: { cookies: [], origins: [] } });

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: SIGN_IN_RE })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("login with invalid credentials shows error", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("bad@example.com");
  await page.locator('input[type="password"]').fill("wrongpassword");
  await page.getByRole("button", { name: SIGN_IN_RE }).click();
  // Expect error toast from Sonner
  await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
    timeout: 10_000,
  });
});

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/app");
  await page.waitForURL("**/login**", { timeout: 10_000 });
});
