import { expect, test } from "@playwright/test";
import { expectNoErrors, navigateToModule } from "../fixtures/base";

test("applications queue loads and opens workbench when rows exist", async ({
  page,
}) => {
  await navigateToModule(page, "applications");
  await expectNoErrors(page);

  await expect(page.getByTestId("applications-summary-band")).toBeVisible();

  const search = page.getByLabel(/search applications|buscar aplicaciones/i);
  await expect(search).toBeVisible();
  await search.fill("a");
  await page.waitForURL(/q=a/);
  await expect(search).toHaveValue("a");

  const queue = page.getByTestId("applications-queue-table");
  const emptyState = page.getByTestId("applications-empty-state");

  if (await queue.count()) {
    const firstOpen = queue.getByRole("link", { name: /open|abrir/i }).first();
    await expect(firstOpen).toBeVisible();
    await firstOpen.click();
    await expect(page).toHaveURL(/\/module\/applications\/[^/?]+/);
    await expect(page.getByTestId("application-workbench")).toBeVisible();
    await expect(page.getByTestId("application-timeline")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/module\/applications/);
  } else {
    await expect(emptyState).toBeVisible();
  }

  await expectNoErrors(page);
});
