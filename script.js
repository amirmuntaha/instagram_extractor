// Instagram Post Poster Generator - Main Script

/**
 * Show the loading spinner overlay (inline on the generate button)
 */
function showSpinner() {
    const btn = document.getElementById('generate-btn');
    if (btn) {
        btn.textContent = 'Generating...';
        btn.disabled = true;
    }
}

/**
 * Hide the loading spinner overlay (restore generate button)
 */
function hideSpinner() {
    const btn = document.getElementById('generate-btn');
    if (btn) {
        btn.textContent = 'Generate Poster';
        btn.disabled = false;
    }
}

/**
 * Show feedback/guidance to the user about the embed reference flow
 * @param {string} message - The guidance message to display
 * @param {string} type - 'info', 'success', or 'warning'
 */
function showFetchFeedback(message, type) {
    // Remove any existing feedback element
    const existingFeedback = document.getElementById('fetch-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    const feedbackEl = document.createElement('div');
    feedbackEl.id = 'fetch-feedback';
    feedbackEl.style.cssText = 'padding: 10px 15px; border-radius: 8px; margin-top: 10px; font-size: 0.85rem; line-height: 1.4;';

    if (type === 'info') {
        feedbackEl.style.backgroundColor = '#d1ecf1';
        feedbackEl.style.color = '#0c5460';
        feedbackEl.style.border = '1px solid #bee5eb';
    } else if (type === 'success') {
        feedbackEl.style.backgroundColor = '#d4edda';
        feedbackEl.style.color = '#155724';
        feedbackEl.style.border = '1px solid #c3e6cb';
    } else {
        feedbackEl.style.backgroundColor = '#fff3cd';
        feedbackEl.style.color = '#856404';
        feedbackEl.style.border = '1px solid #ffc107';
    }

    feedbackEl.textContent = message;

    // Insert feedback after the generate button area
    const btn = document.getElementById('generate-btn');
    const parent = btn.parentElement;
    parent.insertAdjacentElement('afterend', feedbackEl);

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
        if (feedbackEl.parentElement) {
            feedbackEl.style.transition = 'opacity 0.5s';
            feedbackEl.style.opacity = '0';
            setTimeout(() => feedbackEl.remove(), 500);
        }
    }, 15000);
}

/**
 * Display the Instagram embed iframe for the given shortcode
 * @param {string} shortcode - The Instagram post shortcode
 */
function showInstagramEmbed(shortcode) {
    const container = document.getElementById('embed-container');
    if (!container) return;

    container.innerHTML = '';
    container.style.display = 'block';

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    iframe.id = 'instagram-embed-iframe';
    iframe.width = '100%';
    iframe.height = '680';
    iframe.frameBorder = '0';
    iframe.scrolling = 'yes';
    iframe.allowTransparency = 'true';
    iframe.setAttribute('allow', 'encrypted-media');
    container.appendChild(iframe);

    // Show the caption note
    const captionNote = document.getElementById('embed-caption-note');
    if (captionNote) {
        captionNote.style.display = 'block';
    }
}

/**
 * Generate QR code in the section below the embed iframe
 * @param {string} url - The Instagram post URL
 */
let embedQrCodeInstance = null;
function generateQRCode(url) {
    const qrSection = document.getElementById('embed-qr-section');
    const qrContainer = document.getElementById('embed-qr-code');
    if (!qrSection || !qrContainer) return;

    qrSection.style.display = 'block';
    qrContainer.innerHTML = '';

    if (embedQrCodeInstance) {
        embedQrCodeInstance = null;
    }

    try {
        embedQrCodeInstance = new QRCode(qrContainer, {
            text: url,
            width: 120,
            height: 120,
            colorDark: '#262626',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('QR Code generation failed:', error);
        qrContainer.innerHTML = '<div style="width:120px;height:120px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">QR Code</div>';
    }
}

/**
 * Attempt to fetch post data from Instagram's oEmbed JSON endpoint.
 * Returns an object with author_name, title, thumbnail_url on success, or null on failure.
 * @param {string} postUrl - The full Instagram post URL
 * @returns {Promise<{author_name: string, title: string, thumbnail_url: string}|null>}
 */
async function fetchOEmbedData(postUrl) {
    const oEmbedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(postUrl)}&format=json`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(oEmbedUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        // Network error, timeout, or JSON parse error
        return null;
    }
}

/**
 * Generate poster from Instagram URL
 * Shows an Instagram embed iframe with captioned content and a QR code.
 * Attempts to fetch data via oEmbed for additional feedback.
 */
async function generatePoster() {
    const urlInput = document.getElementById('instagram-url');
    const url = urlInput.value.trim();

    if (!url) {
        alert('Please enter an Instagram post URL');
        return;
    }

    if (!isValidInstagramUrl(url)) {
        alert('Please enter a valid Instagram post URL (e.g., https://www.instagram.com/p/ABC123/)');
        return;
    }

    showSpinner();

    try {
        // Extract shortcode from URL
        const { shortcode } = extractFromUrl(url);

        // Show Instagram embed iframe as visual reference (with captioned content)
        if (shortcode) {
            showInstagramEmbed(shortcode);
        }

        // Generate QR code below the iframe
        generateQRCode(url);

        // Attempt to fetch data via oEmbed endpoint for feedback
        const oEmbedData = await fetchOEmbedData(url);

        if (oEmbedData && oEmbedData.author_name) {
            showFetchFeedback(
                'Successfully loaded! The caption and comments are displayed in the embedded post above.',
                'success'
            );
        } else {
            showFetchFeedback(
                'Could not auto-fill data. The caption and comments should be visible in the embedded post above.',
                'info'
            );
        }

    } catch (error) {
        console.error('Error generating poster:', error);
        showFetchFeedback('Something went wrong. The embedded post above should still display captions and comments.', 'warning');
    } finally {
        hideSpinner();
    }
}

/**
 * Validate Instagram URL format
 */
function isValidInstagramUrl(url) {
    const patterns = [
        /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+\/?/,
        /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+\/?/,
        /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+\/?/,
    ];
    return patterns.some(pattern => pattern.test(url));
}

/**
 * Extract available info from the URL itself
 */
function extractFromUrl(url) {
    const shortcodeMatch = url.match(/\/(p|reel|tv)\/([\w-]+)/);
    const shortcode = shortcodeMatch ? shortcodeMatch[2] : '';

    return {
        shortcode: shortcode,
        url: url
    };
}

/**
 * Initialize the page
 */
function init() {
    // Page ready
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Allow pressing Enter in URL field to generate
document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('instagram-url');
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generatePoster();
        }
    });
});
