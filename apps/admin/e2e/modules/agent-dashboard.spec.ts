import { expect, test } from "@playwright/test";

import { expectNoErrors, navigateToModule } from "../fixtures/base";

test("agent dashboard shows the autonomous run inbox", async ({ page }) => {
  await navigateToModule(page, "agent-dashboard");
  await expectNoErrors(page);

  const inbox = page.getByTestId("agent-run-inbox");
  await expect(inbox).toBeVisible();

  const task = page.getByLabel(/run task|tarea a ejecutar/i);
  await expect(task).toBeVisible();

  const startButton = page.getByRole("button", {
    name: /start autonomous run|iniciar ejecucion autonoma/i,
  });
  await expect(startButton).toBeDisabled();

  await task.fill("Draft a daily operations brief and stop for approval on any mutation.");
  await expect(startButton).toBeEnabled();

  await expectNoErrors(page);
});
