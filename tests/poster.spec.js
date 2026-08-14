// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Instagram Post Poster Generator', () => {

  test('page loads correctly with title and heading', async ({ page }) => {
    await page.goto('/');

    // Verify page title
    await expect(page).toHaveTitle('Instagram Post Poster Generator');

    // Verify main heading is visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Instagram Post Poster Generator');
  });

  test('shows alert for invalid URL', async ({ page }) => {
    await page.goto('/');

    // Fill in an invalid URL
    await page.fill('#instagram-url', 'https://google.com/not-instagram');

    // Set up dialog handler before triggering it
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click Generate button
    await page.click('#generate-btn');

    // Wait for the generate button to be re-enabled (indicates click processing finished)
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Verify the alert contained the validation error message
    expect(dialogMessage).toContain('valid Instagram post URL');
  });

  test('no error for valid Instagram URL and embed iframe appears', async ({ page }) => {
    await page.goto('/');

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Fill in a valid Instagram URL
    await page.fill('#instagram-url', 'https://www.instagram.com/p/ABC123/');

    // Track if any dialog appears
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      await dialog.dismiss();
    });

    // Click Generate button and wait for it to finish (button re-enables)
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // No alert should have appeared
    expect(dialogAppeared).toBe(false);

    // Verify embed container is visible with iframe
    const embedContainer = page.locator('#embed-container');
    await expect(embedContainer).toBeVisible();

    const iframe = page.locator('#instagram-embed-iframe');
    await expect(iframe).toBeAttached();
    const src = await iframe.getAttribute('src');
    expect(src).toContain('ABC123');
    expect(src).toContain('/embed/captioned/');
  });

  test('embed iframe has sufficient height and scrolling disabled', async ({ page }) => {
    await page.goto('/');

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Fill in a valid Instagram URL and generate
    await page.fill('#instagram-url', 'https://www.instagram.com/p/HEIGHT_TEST/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Verify the iframe height is 900px (tall enough so no scrolling needed)
    const iframe = page.locator('#instagram-embed-iframe');
    const height = await iframe.getAttribute('height');
    expect(height).toBe('900');

    // Verify scrolling is disabled
    const scrolling = await iframe.getAttribute('scrolling');
    expect(scrolling).toBe('no');
  });

  test('QR code generates after entering valid URL', async ({ page }) => {
    await page.goto('/');

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Fill in a URL and generate
    await page.fill('#instagram-url', 'https://www.instagram.com/p/QR_TEST/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Wait for QR code canvas or img to appear
    const qrChild = page.locator('#embed-qr-code canvas, #embed-qr-code img');
    await expect(qrChild.first()).toBeAttached();

    // Verify the canvas has been rendered
    const count = await qrChild.count();
    expect(count).toBeGreaterThan(0);
  });

});
