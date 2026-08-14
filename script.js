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

    qrContainer.innerHTML = '';

    if (embedQrCodeInstance) {
        embedQrCodeInstance = null;
    }

    try {
        embedQrCodeInstance = new QRCode(qrContainer, {
            text: url,
            width: 400,
            height: 400,
            colorDark: '#262626',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('QR Code generation failed:', error);
        qrContainer.innerHTML = '<div style="width:100%;aspect-ratio:1;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">QR Code</div>';
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

        // Show the poster capture area
        const posterArea = document.getElementById('poster-capture-area');
        if (posterArea) posterArea.style.display = 'block';

        // Show Instagram embed iframe as visual reference (with captioned content)
        if (shortcode) {
            showInstagramEmbed(shortcode);
        }

        // Generate QR code below the iframe
        generateQRCode(url);

        // Show the download button
        const downloadSection = document.getElementById('download-section');
        if (downloadSection) downloadSection.style.display = 'block';

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
 * Download the poster capture area as a PNG image using Screen Capture API.
 * Captures the visible rendered content of the current tab (including cross-origin iframes)
 * and crops to the poster-capture-area element bounds.
 */
async function downloadPoster() {
    const captureArea = document.getElementById('poster-capture-area');
    if (!captureArea) return;

    // Check for Screen Capture API support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen capture is not supported in your browser. Please take a manual screenshot instead.');
        return;
    }

    try {
        // Request tab capture
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'browser' },
            preferCurrentTab: true
        });

        // Create a video element to receive the stream
        const video = document.createElement('video');
        video.srcObject = stream;

        await new Promise((resolve) => {
            video.onloadedmetadata = resolve;
        });
        await video.play();

        // Allow a brief moment for the frame to render
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Get the bounding rect of the poster capture area
        const rect = captureArea.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Calculate source coordinates (the video frame is at device pixel resolution)
        const sx = rect.left * dpr;
        const sy = rect.top * dpr;
        const sw = rect.width * dpr;
        const sh = rect.height * dpr;

        // Create canvas sized to the element dimensions at device pixel resolution
        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

        // Stop all tracks immediately after capturing
        stream.getTracks().forEach(track => track.stop());

        // Convert to PNG and trigger download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'instagram-poster.png';
        link.href = dataUrl;
        link.click();

    } catch (error) {
        // If user cancelled the permission prompt, do nothing
        if (error.name === 'NotAllowedError') {
            return;
        }
        // For other errors, show fallback message
        console.error('Screen capture failed:', error);
        alert('Screen capture failed. Please take a manual screenshot of the poster area instead.');
    }
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
