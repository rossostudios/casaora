import { expect, test } from "@playwright/test";
import { expectNoErrors, navigateToModule } from "../fixtures/base";

test("reservations queue loads and opens workbench when rows exist", async ({
  page,
}) => {
  await navigateToModule(page, "reservations");
  await expectNoErrors(page);

  await expect
    .poll(async () => {
      const summary = await page.getByTestId("reservations-summary-band").count();
      const emptyState = await page.getByTestId("reservations-empty-state").count();
      return summary + emptyState;
    })
    .toBeGreaterThan(0);

  const search = page.getByLabel(/search reservations|buscar reservas/i).first();
  await expect(search).toBeVisible();
  await search.fill("a");
  await page.waitForURL(/q=a/);
  await expect(search).toHaveValue("a");

  const queue = page.getByTestId("reservations-queue-table");
  const emptyState = page.getByTestId("reservations-empty-state");

  if (await queue.count()) {
    const firstOpen = queue.getByRole("link", { name: /open|abrir/i }).first();
    await expect(firstOpen).toBeVisible();
    await firstOpen.click();

    await expect(page).toHaveURL(/\/module\/reservations\/[^/?]+/);
    await expect(page.getByTestId("reservation-workbench")).toBeVisible();
    await expect(page.getByTestId("reservation-availability-panel")).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/module\/reservations/);
  } else {
    await expect(emptyState).toBeVisible();
  }

  await expectNoErrors(page);
});
