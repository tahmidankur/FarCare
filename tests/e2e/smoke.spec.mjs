import { test, expect } from '@playwright/test';

// Stop WhatsApp links from actually opening during tests
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = url => { window.__opened.push(url); return null; };
  });
});

async function onboard(page, phone = '+880 1712 345678') {
  await page.goto('/index.html');
  const sheet = page.locator('#onboarding-overlay');
  await expect(sheet).toBeVisible();
  // Your timezone defaults to the device's
  await expect(page.locator('#ob-mytz')).toHaveValue('America/Vancouver');
  await page.fill('#ob-name', 'Ankur');
  await page.getByRole('button', { name: 'Continue →' }).first().click();
  await page.fill('#ob-cname', 'Ammu');
  await page.fill('#ob-crel', 'Mom');
  await page.fill('#ob-phone', phone);
  await page.locator('#ob-step-1').getByRole('button', { name: 'Continue →' }).click();
}

test('onboarding rejects a bad number and accepts a real one', async ({ page }) => {
  await onboard(page, 'not a number');
  await expect(page.locator('#fc-toast')).toContainText('digits only');
  await expect(page.locator('#ob-step-1')).toHaveClass(/active/);

  await page.fill('#ob-phone', '+880 1712 345678');
  await page.locator('#ob-step-1').getByRole('button', { name: 'Continue →' }).click();
  await page.getByRole('button', { name: 'Start Using FarCare' }).click();
  await expect(page.locator('#onboarding-overlay')).toBeHidden();
});

test('timezone search finds cities missing from the old list', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('[data-tz-filter="ob-mytz"]').fill('lagos');
  await expect(page.locator('#ob-mytz')).toHaveValue('Africa/Lagos');
});

test('check-in: edit the message, send, confirm, see it in history', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: 'Start Using FarCare' }).click();
  await expect(page.locator('#onboarding-overlay')).toBeHidden();

  await page.locator('#checkin-btn').click();
  const sheet = page.locator('#checkin-overlay');
  await expect(sheet).toBeVisible();
  // The page behind the sheet is inert for screen readers
  await expect(page.locator('.app')).toHaveAttribute('inert', '');

  await page.fill('#ci-msg-preview', 'Safe and sound!');
  await sheet.getByRole('button', { name: 'Open & Send' }).click();

  const opened = await page.evaluate(() => window.__opened);
  expect(opened[0]).toBe('https://wa.me/8801712345678?text=Safe%20and%20sound!');

  // Not counted until confirmed
  const ask = page.locator('#sent-check-overlay');
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'Yes, it sent' }).click();
  await expect(page.locator('.streak-pill')).toContainText('1 day');

  await page.goto('/history.html');
  await expect(page.locator('.history-date-label').first()).toHaveText('Today');
  await expect(page.locator('.hi-msg').first()).toHaveText('Safe and sound!');
});

test('"Not yet" leaves history empty', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: 'Start Using FarCare' }).click();
  await page.locator('#checkin-btn').click();
  await page.locator('#checkin-overlay').getByRole('button', { name: 'Open & Send' }).click();
  await page.locator('#sent-check-overlay').getByRole('button', { name: 'Not yet' }).click();
  await page.goto('/history.html');
  await expect(page.getByText('No history yet')).toBeVisible();
});

test('a backup with no templates is refused and the app keeps working', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: 'Start Using FarCare' }).click();
  await page.goto('/settings.html');
  await page.locator('#import-file').setInputFiles({
    name: 'bad.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ farcare_version: 1, templates: [] })),
  });
  await expect(page.locator('#fc-toast')).toContainText('template');
  await page.goto('/index.html');
  await page.locator('#checkin-btn').click();
  await expect(page.locator('#ci-msg-preview')).not.toHaveValue('');
});
