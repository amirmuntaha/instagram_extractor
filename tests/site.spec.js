// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://amirmuntaha.github.io/instagram_extractor/';

/**
 * Site-wide tests for new content pages, navigation, and SEO files.
 * These tests do NOT touch or modify the 10 existing poster.spec.js tests.
 */

test.describe('Content pages load with visible headings', () => {
  const pages = [
    { path: '/about.html', heading: 'About' },
    { path: '/contact.html', heading: 'Contact' },
    { path: '/privacy.html', heading: 'Privacy' },
    { path: '/guides/index.html', heading: 'Guides' },
    { path: '/guides/share-instagram-posts-offline-with-qr-codes.html', heading: 'QR Codes' },
    { path: '/guides/understanding-instagram-post-embeds.html', heading: 'Embeds' },
    { path: '/guides/why-qr-codes-are-perfect-for-social-media-sharing.html', heading: 'QR Codes' },
    { path: '/guides/how-to-save-and-archive-instagram-posts.html', heading: 'Save' },
  ];

  for (const { path, heading } of pages) {
    test(`${path} loads and has a visible h1`, async ({ page }) => {
      await page.goto(path);
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
      // Sanity-check: the heading text contains the expected keyword
      await expect(h1).toContainText(new RegExp(heading, 'i'));
    });
  }
});

test.describe('Shared navigation on index.html', () => {
  test('nav exists and links to key pages', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav.site-nav');
    await expect(nav).toBeVisible();

    // Check that nav contains links to the essential pages
    const expectedLinks = [
      'guides/index.html',
      'about.html',
      'contact.html',
      'privacy.html',
    ];
    for (const href of expectedLinks) {
      const link = nav.locator(`a[href="${href}"]`);
      await expect(link).toBeVisible();
    }
  });
});

test.describe('Contact page', () => {
  test('contact.html has a mailto: link', async ({ page }) => {
    await page.goto('/contact.html');
    const mailto = page.locator('a[href^="mailto:"]');
    await expect(mailto).toBeVisible();
  });
});

test.describe('SEO infrastructure files', () => {
  test('robots.txt is served and references sitemap.xml', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('sitemap.xml');
    expect(body).toContain('Sitemap:');
  });

  test('sitemap.xml is served and lists expected URLs', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    // Contains the absolute base URL
    expect(body).toContain(BASE_URL);
    // Contains at least one guides URL
    expect(body).toContain(`${BASE_URL}guides/`);
    // Verify all page URLs are present
    const expectedPaths = [
      '',
      'about.html',
      'contact.html',
      'privacy.html',
      'guides/index.html',
      'guides/share-instagram-posts-offline-with-qr-codes.html',
      'guides/understanding-instagram-post-embeds.html',
      'guides/why-qr-codes-are-perfect-for-social-media-sharing.html',
      'guides/how-to-save-and-archive-instagram-posts.html',
    ];
    for (const p of expectedPaths) {
      expect(body).toContain(`${BASE_URL}${p}`);
    }
  });
});
