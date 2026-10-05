import type { Page } from '@playwright/test';
export async function openTool(page: Page, name: string) {
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await close.isVisible()) await close.click();
  await page.getByRole('navigation', { name: 'Floating tools' }).getByRole('button', { name, exact: true }).click();
}
