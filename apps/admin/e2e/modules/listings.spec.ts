import { expect, test } from "@playwright/test";
import { expectNoErrors, navigateToModule } from "../fixtures/base";

test("listings queue loads and opens workbench when rows exist", async ({
  page,
}) => {
  await navigateToModule(page, "listings");
  await expectNoErrors(page);

  await expect
    .poll(async () => {
      const summary = await page.getByTestId("listings-summary-band").count();
      const emptyState = await page.getByTestId("listings-empty-state").count();
      return summary + emptyState;
    })
    .toBeGreaterThan(0);

  const search = page.getByLabel(/search listings|buscar anuncios/i);
  await expect(search).toBeVisible();
  await search.fill("a");
  await page.waitForURL(/q=a/);
  await expect(search).toHaveValue("a");

  const queue = page.getByTestId("listings-queue-table");
  const emptyState = page.getByTestId("listings-empty-state");

  if (await queue.count()) {
    const firstOpen = queue.getByRole("link", { name: /open|abrir/i }).first();
    await expect(firstOpen).toBeVisible();
    await firstOpen.click();

    await expect(page).toHaveURL(/\/module\/listings\/[^/?]+/);
    await expect(page.getByTestId("listing-workbench")).toBeVisible();
    await expect(page.getByTestId("listing-applications-panel")).toBeVisible();

    const previewButton = page.getByRole("button", {
      name: /preview|vista previa/i,
    });
    if (await previewButton.count()) {
      await previewButton.first().click();
      await expect(page.getByText(/casaora\.co\//i).first()).toBeVisible();
    }
  } else {
    await expect(emptyState).toBeVisible();
  }

  await expectNoErrors(page);
});
