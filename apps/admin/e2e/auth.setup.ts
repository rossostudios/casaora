import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";
const SIGN_IN_RE = /sign in|iniciar/i;

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!(email && password)) {
    throw new Error(
      "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set. Copy .env.e2e.example to .env.e2e and fill in credentials."
    );
  }

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: SIGN_IN_RE }).click();

  // Wait for redirect to /app
  await page.waitForURL("**/app**", { timeout: 15_000 });

  // Wait for admin shell to render
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

  await page.context().storageState({ path: authFile });
});
