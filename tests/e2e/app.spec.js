import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '../../');

test.describe('Delver of Secrets E2E', () => {
  let app;
  let page;

  test.beforeEach(async () => {
    app = await electron.launch({
      args: [path.join(appRoot, 'main/main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('loads the history tab on start', async () => {
    await expect(page.locator('h2')).toContainText('Match History');
  });

  test('navigates to stats tab', async () => {
    await page.click('button:has-text("Statistics")');
    await expect(page.locator('h2')).toContainText('Statistics');
  });

  test('stats tab shows overview cards', async () => {
    await page.click('button:has-text("Statistics")');
    await expect(page.locator('.stat-card')).toHaveCount(4);
  });

  test('filter bar is visible on history tab', async () => {
    await expect(page.locator('.filter-bar')).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test('empty state is shown when no matches exist', async () => {
    // Fresh DB will have no matches
    const emptyState = page.locator('.empty-state');
    // Either loading or actual empty state message
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });
});
