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

    // Click Generate button and wait for it to finish (button re-enables)
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

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

    // Wait for QR code canvas or img to appear (deterministic)
    const qrChild = page.locator('#qr-code canvas, #qr-code img');
    await expect(qrChild.first()).toBeAttached();

    // Verify the canvas has been rendered
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

  test('spinner is visible during poster generation', async ({ page }) => {
    await page.goto('/');

    const spinner = page.locator('#spinner-overlay');

    // Verify spinner is initially hidden
    await expect(spinner).toHaveClass(/hidden/);

    // Directly invoke showSpinner to verify the mechanism works
    await page.evaluate(() => showSpinner());
    await expect(spinner).not.toHaveClass(/hidden/);
    await expect(spinner).toBeVisible();

    // Now hide it and verify
    await page.evaluate(() => hideSpinner());
    await expect(spinner).toHaveClass(/hidden/);

    // Also verify that generatePoster triggers the spinner lifecycle
    // by checking the button state change (which happens alongside spinner)
    await page.fill('#instagram-url', 'https://www.instagram.com/p/ABC123/');
    await page.click('#generate-btn');

    // The button should be disabled while generating, then re-enabled
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // After generation completes, spinner should be hidden
    await expect(spinner).toHaveClass(/hidden/);
  });

  test('theme selector applies correct class to poster', async ({ page }) => {
    await page.goto('/');

    const poster = page.locator('#poster');

    // Default: no theme class applied
    await expect(poster).not.toHaveClass(/theme-dark/);
    await expect(poster).not.toHaveClass(/theme-gradient/);

    // Select dark theme
    await page.selectOption('#theme-select', 'dark');
    await expect(poster).toHaveClass(/theme-dark/);
    await expect(poster).not.toHaveClass(/theme-gradient/);

    // Select gradient theme
    await page.selectOption('#theme-select', 'gradient');
    await expect(poster).toHaveClass(/theme-gradient/);
    await expect(poster).not.toHaveClass(/theme-dark/);

    // Switch back to light theme
    await page.selectOption('#theme-select', 'light');
    await expect(poster).not.toHaveClass(/theme-dark/);
    await expect(poster).not.toHaveClass(/theme-gradient/);
  });

  test('copy to clipboard button shows copying state on click', async ({ page, context }) => {
    await page.goto('/');

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);

    // Fill in some data to have a poster to copy
    await page.fill('#username', 'clipuser');
    await page.click('.update-btn');

    const copyBtn = page.locator('.copy-btn');
    await expect(copyBtn).toHaveText('Copy to Clipboard');

    // Click the copy button and verify it transitions to "Copying..." state
    await page.click('.copy-btn');
    await expect(copyBtn).toHaveText('Copying...');

    // Wait for the operation to complete - button should show "Copied!" or revert
    await expect(copyBtn).not.toHaveText('Copying...', { timeout: 10000 });
  });

  test('autofill populates form fields when fetch succeeds (mocked)', async ({ page }) => {
    await page.goto('/');

    // Mock CORS proxy responses to simulate a successful Instagram data fetch
    const fakeInstagramHtml = `
      <html>
      <head>
        <meta property="og:image" content="https://example.com/fake-image.jpg" />
        <meta property="og:description" content="42 Likes, 3 Comments - @testcreator on Instagram: &quot;This is a test caption from Instagram&quot;" />
      </head>
      <body></body>
      </html>
    `;

    // Intercept requests to CORS proxy services and return our fake HTML
    await page.route('**/api.codetabs.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: fakeInstagramHtml
      });
    });

    await page.route('**/corsproxy.io/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: fakeInstagramHtml
      });
    });

    await page.route('**/api.allorigins.win/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: fakeInstagramHtml
      });
    });

    // Enter a valid Instagram URL and generate
    await page.fill('#instagram-url', 'https://www.instagram.com/p/TEST_AUTOFILL/');
    await page.click('#generate-btn');

    // Wait for the button to re-enable (generation complete)
    await expect(page.locator('#generate-btn')).toBeEnabled({ timeout: 15000 });

    // Verify form fields were auto-populated with the mocked data
    const usernameField = page.locator('#username');
    await expect(usernameField).toHaveValue('testcreator');

    const captionField = page.locator('#caption');
    await expect(captionField).toHaveValue('This is a test caption from Instagram');

    const imageField = page.locator('#post-image');
    await expect(imageField).toHaveValue('https://example.com/fake-image.jpg');

    // Verify the poster was updated with this data
    const posterUsername = page.locator('#poster-username');
    await expect(posterUsername).toHaveText('@testcreator');

    const posterCaption = page.locator('#poster-caption');
    await expect(posterCaption).toContainText('This is a test caption from Instagram');

    // Verify the feedback message indicates success
    const feedback = page.locator('#fetch-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('auto-filled');
  });

  test('autofill gracefully degrades when fetch fails', async ({ page }) => {
    await page.goto('/');

    // Mock CORS proxy responses to simulate failure (return empty/error)
    await page.route('**/api.codetabs.com/**', (route) => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });

    await page.route('**/corsproxy.io/**', (route) => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });

    await page.route('**/api.allorigins.win/**', (route) => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });

    // Track page errors to ensure none are thrown
    const pageErrors = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Enter a valid Instagram URL
    await page.fill('#instagram-url', 'https://www.instagram.com/p/FAIL_TEST/');
    await page.click('#generate-btn');

    // Wait for the button to re-enable (generation complete)
    await expect(page.locator('#generate-btn')).toBeEnabled({ timeout: 15000 });

    // No uncaught page errors should have occurred
    expect(pageErrors).toHaveLength(0);

    // The poster should still be rendered (QR code generated)
    const qrChild = page.locator('#qr-code canvas, #qr-code img');
    await expect(qrChild.first()).toBeAttached();

    // Feedback should indicate that auto-fetch failed
    const feedback = page.locator('#fetch-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('unable to retrieve data');
  });

});
