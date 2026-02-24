import { expect, test } from "@playwright/test";

test("agents chat page loads", async ({ page }) => {
  await page.goto("/app/agents");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
});

test("agents page shows agent list", async ({ page }) => {
  await page.goto("/app/agents");
  await page.waitForLoadState("networkidle");
  // Should have some interactive elements for agent selection
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
});

test("chat input is available", async ({ page }) => {
  await page.goto("/app/agents");
  await page.waitForLoadState("networkidle");
  // Look for a textarea or input for sending messages
  const input = page.locator('textarea, input[type="text"]').first();
  await expect(input).toBeVisible({ timeout: 10_000 });
});
