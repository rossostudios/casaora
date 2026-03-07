import { expect, test } from "@playwright/test";
import { expectNoErrors, navigateToApp } from "../fixtures/base";

test("portfolio analytics page loads and switches period", async ({ page }) => {
  await navigateToApp(page, "portfolio");

  await expect
    .poll(async () => {
      const summary = await page.getByTestId("portfolio-summary").count();
      const emptyState = await page.getByTestId("portfolio-empty-state").count();
      return summary + emptyState;
    })
    .toBeGreaterThan(0);

  if (await page.getByTestId("portfolio-summary").count()) {
    const trend90d = page.getByTestId("portfolio-period-90d");
    await trend90d.click();
    await expect(trend90d).toHaveAttribute("aria-pressed", "true");
  }

  await expect
    .poll(async () => {
      const topProperties = await page.getByTestId("portfolio-top-properties").count();
      const emptyState = await page.getByTestId("portfolio-empty-state").count();
      return topProperties + emptyState;
    })
    .toBeGreaterThan(0);

  await expectNoErrors(page);
});

test("legacy portfolio route redirects to app portfolio", async ({ page }) => {
  await page.goto("/module/portfolio");
  await page.waitForURL("**/app/portfolio**", { timeout: 10_000 });
  await expect
    .poll(async () => {
      const summary = await page.getByTestId("portfolio-summary").count();
      const emptyState = await page.getByTestId("portfolio-empty-state").count();
      return summary + emptyState;
    })
    .toBeGreaterThan(0);
  await expectNoErrors(page);
});
