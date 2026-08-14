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

  test('download button with "Capture & Download" text is visible after generating poster', async ({ page }) => {
    await page.goto('/');

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Download section should be hidden initially
    const downloadSection = page.locator('#download-section');
    await expect(downloadSection).toBeHidden();

    // Fill in a valid Instagram URL and generate
    await page.fill('#instagram-url', 'https://www.instagram.com/p/DL_BTN_TEST/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Download section should now be visible
    await expect(downloadSection).toBeVisible();

    // Verify the download button has the correct text
    const downloadBtn = page.locator('#download-btn');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toHaveText('Capture & Download');
  });

  test('download button shows alert when Screen Capture API is not supported', async ({ page }) => {
    await page.goto('/');

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Fill in a valid Instagram URL and generate
    await page.fill('#instagram-url', 'https://www.instagram.com/p/CAPTURE_TEST/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Set up a dialog handler to capture the alert message
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click the download button - in headless Chromium, getDisplayMedia is not supported
    await page.click('#download-btn');

    // Wait briefly for the dialog to fire
    await page.waitForTimeout(500);

    // Verify the dialog message indicates Screen Capture is not supported
    expect(dialogMessage).toBeTruthy();
    expect(
      dialogMessage.includes('Screen capture is not supported') ||
      dialogMessage.includes('manual screenshot')
    ).toBe(true);
  });

  test('capture path proceeds without errors when getDisplayMedia is mocked with browser surface', async ({ page }) => {
    // Mock getDisplayMedia via addInitScript to intercept the entire downloadPoster flow
    await page.addInitScript(() => {
      // Override downloadPoster to simulate a successful capture path without needing
      // real video/stream plumbing (which is unavailable in headless Chromium).
      // We validate that the function checks the API, validates the surface, and doesn't alert.
      window.__capturePathReached = false;
      window.__surfaceValidationPassed = false;
      window.__zoomApplied = false;

      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      navigator.mediaDevices.getDisplayMedia = async (constraints) => {
        window.__capturePathReached = true;
        // Create a real canvas stream that browsers can actually use as a video source
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(0, 0, 1920, 1080);
        const stream = canvas.captureStream(30);
        // Patch the video track's getSettings to report browser surface
        const realTrack = stream.getVideoTracks()[0];
        const originalGetSettings = realTrack.getSettings.bind(realTrack);
        realTrack.getSettings = () => {
          const s = originalGetSettings();
          s.displaySurface = 'browser';
          return s;
        };
        return stream;
      };

      // Observe zoom changes
      const zoomDescriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'zoom') ||
                             Object.getOwnPropertyDescriptor(HTMLElement.prototype.style.constructor.prototype, 'zoom');
      // Use a MutationObserver-style approach: watch after capture starts
      const origScrollIntoView = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function(...args) {
        if (this.id === 'poster-capture-area') {
          window.__zoomApplied = true;
        }
        return origScrollIntoView.apply(this, args);
      };
    });

    await page.goto('/');

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Generate the poster first
    await page.fill('#instagram-url', 'https://www.instagram.com/p/CAPTURE_MOCK/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Track alerts - none should fire for a successful capture
    let dialogAppeared = false;
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click the download button
    await page.click('#download-btn');

    // Wait for the capture logic to complete
    await page.waitForTimeout(1000);

    // No alert should have appeared (successful capture path)
    expect(dialogAppeared).toBe(false);

    // Verify the capture path was reached
    const captureReached = await page.evaluate(() => window.__capturePathReached);
    expect(captureReached).toBe(true);
  });

  test('capture path shows alert when non-browser surface is selected', async ({ page }) => {
    // Mock getDisplayMedia to return a stream with monitor displaySurface
    await page.addInitScript(() => {
      const mockTrack = {
        stop: () => {},
        getSettings: () => ({ displaySurface: 'monitor', width: 1920, height: 1080 }),
        kind: 'video',
        enabled: true,
        readyState: 'live'
      };
      const mockStream = {
        getVideoTracks: () => [mockTrack],
        getTracks: () => [mockTrack],
        getAudioTracks: () => []
      };

      navigator.mediaDevices.getDisplayMedia = async () => mockStream;
    });

    await page.goto('/');

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Generate the poster first
    await page.fill('#instagram-url', 'https://www.instagram.com/p/SURFACE_TEST/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Track alerts
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click the download button
    await page.click('#download-btn');

    // Wait for the alert
    await page.waitForTimeout(500);

    // Should show surface validation error
    expect(dialogMessage).toContain('Please select the current browser tab');
    expect(dialogMessage).toContain('Other surfaces are not supported');
  });

  test('capture-hint text is displayed below the download button after poster generation', async ({ page }) => {
    await page.goto('/');

    // Block Instagram embed requests
    await page.route('**/instagram.com/p/*/embed/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>embed</body></html>' });
    });

    // Capture hint should be hidden initially (inside download-section which is hidden)
    const captureHint = page.locator('#download-section .capture-hint');
    await expect(captureHint).toBeHidden();

    // Fill in a valid Instagram URL and generate
    await page.fill('#instagram-url', 'https://www.instagram.com/p/HINT_TEST/');
    await page.click('#generate-btn');
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // Verify the capture hint text is now visible
    await expect(captureHint).toBeVisible();
    await expect(captureHint).toContainText('Your browser will ask permission to capture this tab');
    await expect(captureHint).toContainText('saved as a PNG image');
  });

});
