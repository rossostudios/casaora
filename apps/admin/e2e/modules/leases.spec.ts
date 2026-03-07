import { expect, test } from "@playwright/test";
import { expectNoErrors, navigateToModule } from "../fixtures/base";

test("leases queue loads and opens workbench when rows exist", async ({ page }) => {
  await navigateToModule(page, "leases");
  await expectNoErrors(page);

  await expect
    .poll(async () => {
      const summary = await page.getByTestId("leases-summary-band").count();
      const emptyState = await page.getByTestId("leases-empty-state").count();
      return summary + emptyState;
    })
    .toBeGreaterThan(0);

  const search = page.getByLabel(/search|buscar/i).first();
  await expect(search).toBeVisible();
  await search.fill("a");
  await page.waitForURL(/q=a/);
  await expect(search).toHaveValue("a");

  const queue = page.getByTestId("leases-queue-table");
  const emptyState = page.getByTestId("leases-empty-state");

  if (await queue.count()) {
    const firstOpen = queue.getByRole("link", { name: /open|abrir/i }).first();
    await expect(firstOpen).toBeVisible();
    await firstOpen.click();

    await expect(page).toHaveURL(/\/module\/leases\/[^/?]+/);
    await expect(page.getByTestId("lease-workbench")).toBeVisible();
    await expect(page.getByTestId("lease-collections-panel")).toBeVisible();
    await expect(page.getByTestId("lease-documents-panel")).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/module\/leases/);
  } else {
    await expect(emptyState).toBeVisible();
  }

  await expectNoErrors(page);
});
