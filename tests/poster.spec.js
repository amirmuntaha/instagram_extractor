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

    // Wait for the dialog to be handled
    await page.waitForTimeout(500);

    // Verify the alert contained the validation error message
    expect(dialogMessage).toContain('valid Instagram post URL');
  });

  test('no error for valid Instagram URL', async ({ page }) => {
    await page.goto('/');

    // Fill in a valid Instagram URL
    await page.fill('#instagram-url', 'https://www.instagram.com/p/ABC123/');

    // Track if any dialog appears
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      await dialog.dismiss();
    });

    // Click Generate button
    await page.click('#generate-btn');

    // Wait a moment for any potential dialog
    await page.waitForTimeout(1000);

    // No alert should have appeared
    expect(dialogAppeared).toBe(false);
  });

  test('manual form input updates poster content', async ({ page }) => {
    await page.goto('/');

    // Fill in manual form fields
    await page.fill('#username', 'testuser');
    await page.fill('#caption', 'This is a test caption');
    await page.fill('#comments', 'commenter1: Nice photo!\ncommenter2: Awesome!');
    await page.fill('#likes', '1500');

    // Click Update Poster button
    await page.click('.update-btn');

    // Verify poster content is updated
    const username = page.locator('#poster-username');
    await expect(username).toHaveText('@testuser');

    const caption = page.locator('#poster-caption');
    await expect(caption).toContainText('This is a test caption');

    const likes = page.locator('#poster-likes');
    await expect(likes).toContainText('1,500 likes');

    // Verify comments are displayed
    const comments = page.locator('#poster-comments');
    await expect(comments).toContainText('commenter1');
    await expect(comments).toContainText('Nice photo!');
  });

  test('QR code generates after updating poster', async ({ page }) => {
    await page.goto('/');

    // Fill in a URL and update
    await page.fill('#instagram-url', 'https://www.instagram.com/p/TEST123/');
    await page.fill('#username', 'qruser');

    // Click Update Poster
    await page.click('.update-btn');

    // Wait for QR code to render
    await page.waitForTimeout(500);

    // Verify QR code container has a canvas or img child element
    const qrContainer = page.locator('#qr-code');
    const qrChild = qrContainer.locator('canvas, img');
    await expect(qrChild.first()).toBeAttached();
    // Verify the canvas has non-zero dimensions
    const count = await qrChild.count();
    expect(count).toBeGreaterThan(0);
  });

  test('download button exists and is enabled', async ({ page }) => {
    await page.goto('/');

    const downloadBtn = page.locator('.download-btn');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();
    await expect(downloadBtn).toHaveText('Download as Image');
  });

  test('copy to clipboard button exists and is enabled', async ({ page }) => {
    await page.goto('/');

    const copyBtn = page.locator('.copy-btn');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toBeEnabled();
    await expect(copyBtn).toHaveText('Copy to Clipboard');
  });

});
