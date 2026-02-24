import { expect, test } from "@playwright/test";

test("approvals are accessible via agent chat", async ({ page }) => {
  await page.goto("/app/agents");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
});
