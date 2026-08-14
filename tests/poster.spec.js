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

    // Mock the oEmbed endpoint
    await page.route('**/api.instagram.com/oembed/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ author_name: 'user', title: 'A caption', thumbnail_url: '' })
      });
    });

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

  test('embed iframe has sufficient height for captions and comments', async ({ page }) => {
    await page.goto('/');

    // Mock the oEmbed endpoint
    await page.route('**/api.instagram.com/oembed/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ author_name: 'user', title: '', thumbnail_url: '' })
      });
    });

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Fill in a valid Instagram URL and generate
    await page.fill('#instagram-url', 'https://www.instagram.com/p/HEIGHT_TEST/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Verify the iframe height is at least 600px to show captions/comments
    const iframe = page.locator('#instagram-embed-iframe');
    const height = await iframe.getAttribute('height');
    expect(parseInt(height)).toBeGreaterThanOrEqual(600);
  });

  test('QR code generates after entering valid URL', async ({ page }) => {
    await page.goto('/');

    // Mock the oEmbed endpoint
    await page.route('**/api.instagram.com/oembed/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ author_name: 'qruser', title: 'QR test', thumbnail_url: '' })
      });
    });

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

  test('success feedback is shown when oEmbed fetch succeeds', async ({ page }) => {
    await page.goto('/');

    // Mock the oEmbed endpoint to return valid data
    await page.route('**/api.instagram.com/oembed/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          author_name: 'testcreator',
          title: 'Beautiful sunset over the ocean #nature #photography',
          thumbnail_url: 'https://scontent.cdninstagram.com/v/t51.2885-15/test-image.jpg'
        })
      });
    });

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Enter a valid Instagram URL
    await page.fill('#instagram-url', 'https://www.instagram.com/p/TEST_AUTOFILL/');
    await page.click('#generate-btn');

    // Wait for the button to re-enable (generation complete)
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Verify success feedback message
    const feedback = page.locator('#fetch-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Successfully loaded');

    // Verify embed container is shown
    const embedContainer = page.locator('#embed-container');
    await expect(embedContainer).toBeVisible();

    const iframe = page.locator('#instagram-embed-iframe');
    await expect(iframe).toBeAttached();
    const src = await iframe.getAttribute('src');
    expect(src).toContain('TEST_AUTOFILL');
  });

  test('graceful degradation shows embed and guidance when oEmbed fails', async ({ page }) => {
    await page.goto('/');

    // Mock the oEmbed endpoint to return an error
    await page.route('**/api.instagram.com/oembed/**', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'text/plain',
        body: 'Service Unavailable'
      });
    });

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Enter a valid Instagram URL
    await page.fill('#instagram-url', 'https://www.instagram.com/p/DEGRADE_TEST/');
    await page.click('#generate-btn');

    // Wait for the button to re-enable (generation complete)
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Verify embed container is visible as fallback reference
    const embedContainer = page.locator('#embed-container');
    await expect(embedContainer).toBeVisible();

    const iframe = page.locator('#instagram-embed-iframe');
    await expect(iframe).toBeAttached();
    const src = await iframe.getAttribute('src');
    expect(src).toContain('DEGRADE_TEST');

    // Verify guidance feedback message
    const feedback = page.locator('#fetch-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Could not auto-fill');
  });

  test('caption note is displayed below the embed', async ({ page }) => {
    await page.goto('/');

    // Mock the oEmbed endpoint
    await page.route('**/api.instagram.com/oembed/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ author_name: 'user', title: 'test', thumbnail_url: '' })
      });
    });

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Enter a valid Instagram URL
    await page.fill('#instagram-url', 'https://www.instagram.com/p/CAPTION_NOTE/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Verify caption note is visible
    const captionNote = page.locator('#embed-caption-note');
    await expect(captionNote).toBeVisible();
    await expect(captionNote).toContainText('Captions and top comments are displayed');
  });

});
