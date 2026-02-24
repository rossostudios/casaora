import { expect, type Page } from "@playwright/test";

/**
 * Navigate to a module page and wait for main content to be visible.
 */
export async function navigateToModule(page: Page, slug: string) {
  await page.goto(`/module/${slug}`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Navigate to an app page and wait for main content to be visible.
 */
export async function navigateToApp(page: Page, path: string) {
  await page.goto(`/app/${path}`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Wait for a Sonner toast to appear with specific text.
 */
export async function waitForToast(page: Page, text: string | RegExp) {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: text });
  await expect(toast.first()).toBeVisible({ timeout: 5000 });
}

/**
 * Check that no unhandled errors appear on the page.
 */
export async function expectNoErrors(page: Page) {
  const errorOverlay = page.locator("nextjs-portal");
  await expect(errorOverlay).toHaveCount(0);
}
