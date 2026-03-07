import { expect, test } from "@playwright/test";
import { navigateToModule } from "../fixtures/base";

async function expectNoApiConnectionFailure(page: import("@playwright/test").Page) {
  await expect(
    page.getByText(/API connection failed|Fallo de conexión a la API/i)
  ).toHaveCount(0);
}

test("authenticated SSR routes mint backend auth and load without API failure cards", async ({
  page,
}) => {
  await navigateToModule(page, "properties");
  await expectNoApiConnectionFailure(page);

  await navigateToModule(page, "applications");
  await expectNoApiConnectionFailure(page);

  const diagnostics = await page.evaluate(async () => {
    const response = await fetch("/api/auth/diagnostics", {
      credentials: "include",
    });
    return {
      status: response.status,
      body: await response.json(),
    };
  });

  expect(diagnostics.status).toBe(200);
  expect(diagnostics.body.hasUserId).toBe(true);
  expect(diagnostics.body.hasSessionId).toBe(true);
  expect(diagnostics.body.canGetToken).toBe(true);
});
