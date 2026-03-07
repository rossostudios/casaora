import { expect, test } from "@playwright/test";
import { expectNoErrors, navigateToModule } from "../fixtures/base";

test("channels page shows marketplace-only publication health", async ({
  page,
}) => {
  await navigateToModule(page, "channels");
  await expect(page.getByTestId("channels-marketplace-health")).toBeVisible();
  await expect(page.getByText(/Casaora Marketplace/i)).toBeVisible();
  await expect(page.getByText(/Connect Airbnb|Conectar Airbnb/i)).toHaveCount(0);
  await expectNoErrors(page);
});
