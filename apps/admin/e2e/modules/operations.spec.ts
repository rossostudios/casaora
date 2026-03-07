import { expect, test } from "@playwright/test";
import { expectNoErrors, navigateToModule } from "../fixtures/base";

test("operations queue loads and persists search filters", async ({ page }) => {
  await navigateToModule(page, "operations");
  await expectNoErrors(page);

  await expect(page.getByTestId("operations-summary-band")).toBeVisible();

  const search = page.getByLabel(/search operations|buscar operaciones/i);
  await expect(search).toBeVisible();
  await search.fill("a");
  await page.waitForURL(/q=a/);
  await expect(search).toHaveValue("a");

  await expect
    .poll(async () => {
      const queue = await page.getByTestId("operations-queue-table").count();
      const empty = await page.getByTestId("operations-empty-state").count();
      return queue + empty;
    })
    .toBeGreaterThan(0);

  const queue = page.getByTestId("operations-queue-table");
  if (await queue.count()) {
    const firstOpen = queue.getByRole("link", { name: /open|abrir/i }).first();
    await expect(firstOpen).toBeVisible();
  } else {
    await expect(page.getByTestId("operations-empty-state")).toBeVisible();
  }

  await expect(page.getByTestId("operations-attention-list")).toBeVisible();
  await expectNoErrors(page);
});
