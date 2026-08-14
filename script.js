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
    iframe.height = '900';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.allowTransparency = 'true';
    iframe.setAttribute('allow', 'encrypted-media');
    container.appendChild(iframe);
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
            width: 180,
            height: 180,
            colorDark: '#262626',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('QR Code generation failed:', error);
        qrContainer.innerHTML = '<div style="width:180px;height:180px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">QR Code</div>';
    }
}

/**
 * Generate poster from Instagram URL
 * Shows an Instagram embed iframe with captioned content and a QR code.
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

    } catch (error) {
        console.error('Error generating poster:', error);
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
