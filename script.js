// Instagram Post Poster Generator - Main Script

let qrCodeInstance = null;

/**
 * Show the loading spinner overlay
 */
function showSpinner() {
    const spinner = document.getElementById('spinner-overlay');
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

/**
 * Hide the loading spinner overlay
 */
function hideSpinner() {
    const spinner = document.getElementById('spinner-overlay');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

/**
 * Generate poster from Instagram URL
 * Uses Instagram's oEmbed endpoint to fetch post data
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

    const btn = document.getElementById('generate-btn');
    btn.textContent = 'Generating...';
    btn.disabled = true;
    showSpinner();

    try {
        // Try fetching data via Instagram oEmbed API
        const postData = await fetchInstagramData(url);
        
        if (postData) {
            // Populate manual fields with fetched data
            if (postData.username) {
                document.getElementById('username').value = postData.username;
            }
            if (postData.caption) {
                document.getElementById('caption').value = postData.caption;
            }
            if (postData.imageUrl) {
                document.getElementById('post-image').value = postData.imageUrl;
            }
        }

        // Update poster with whatever data we have
        updatePosterFromData(url);

    } catch (error) {
        console.error('Error fetching Instagram data:', error);
        // Still update poster with the URL for QR code
        updatePosterFromData(url);
    } finally {
        btn.textContent = 'Generate Poster';
        btn.disabled = false;
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
 * Fetch Instagram post data via oEmbed API
 */
async function fetchInstagramData(url) {
    try {
        // Instagram oEmbed endpoint
        const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=`;
        
        // Note: oEmbed requires an access token in production
        // For demo purposes, we'll extract what we can from the URL
        const postData = extractFromUrl(url);
        return postData;
    } catch (error) {
        console.error('oEmbed fetch failed:', error);
        return extractFromUrl(url);
    }
}

/**
 * Extract available info from the URL itself
 */
function extractFromUrl(url) {
    const shortcodeMatch = url.match(/\/(p|reel|tv)\/([\w-]+)/);
    const shortcode = shortcodeMatch ? shortcodeMatch[2] : '';

    return {
        shortcode: shortcode,
        url: url,
        username: '',
        caption: '',
        imageUrl: ''
    };
}

/**
 * Update poster from manual input fields
 */
function updatePoster() {
    const url = document.getElementById('instagram-url').value.trim() || 'https://www.instagram.com/p/example/';
    updatePosterFromData(url);
}

/**
 * Core function to update the poster display
 */
function updatePosterFromData(url) {
    const username = document.getElementById('username').value.trim() || '@instagram_user';
    const caption = document.getElementById('caption').value.trim() || 'No caption provided';
    const imageUrl = document.getElementById('post-image').value.trim();
    const comments = document.getElementById('comments').value.trim();
    const likes = document.getElementById('likes').value.trim() || '0';
    const postDate = document.getElementById('post-date').value.trim() || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Update username and avatar
    const displayUsername = username.startsWith('@') ? username : `@${username}`;
    document.getElementById('poster-username').textContent = displayUsername;
    document.getElementById('avatar-display').textContent = username.replace('@', '').charAt(0).toUpperCase();

    // Update date
    document.getElementById('poster-date').textContent = postDate;

    // Update image
    const imageArea = document.getElementById('poster-image-area');
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Instagram post';
        img.onerror = function() {
            // Revert to placeholder on error
            imageArea.innerHTML = `
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#999" stroke-width="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="2"></rect>
                    <circle cx="8" cy="8" r="2"></circle>
                    <path d="M2 16l5-5 3 3 5-5 7 7"></path>
                </svg>
                <p>Image could not be loaded</p>
            `;
        };
        // Replace the container content
        const container = document.querySelector('.poster-image-container');
        container.innerHTML = '';
        container.appendChild(img);
    } else {
        // Show placeholder with Instagram-like gradient
        const container = document.querySelector('.poster-image-container');
        container.innerHTML = `
            <div class="poster-image-placeholder" id="poster-image-area" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7);">
                <div style="text-align:center;color:#fff;">
                    <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#fff" stroke-width="1.5">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <circle cx="12" cy="12" r="5"></circle>
                        <circle cx="17.5" cy="6.5" r="1.5" fill="#fff" stroke="none"></circle>
                    </svg>
                    <p style="margin-top:12px;font-size:0.9rem;opacity:0.9;">Instagram Post</p>
                </div>
            </div>
        `;
    }

    // Update likes
    document.getElementById('poster-likes').textContent = `${formatNumber(likes)} likes`;

    // Update caption
    document.getElementById('poster-caption').innerHTML = `<strong>${escapeHtml(displayUsername)}</strong> ${escapeHtml(caption)}`;

    // Update comments
    const commentsContainer = document.getElementById('poster-comments');
    if (comments) {
        const commentLines = comments.split('\n').filter(line => line.trim());
        commentsContainer.innerHTML = commentLines.slice(0, 5).map(line => {
            const parts = line.split(':');
            const commenter = parts[0].trim();
            const commentText = parts.slice(1).join(':').trim();
            return `<div class="comment"><p><strong>${escapeHtml(commenter)}</strong> ${escapeHtml(commentText)}</p></div>`;
        }).join('');
    } else {
        commentsContainer.innerHTML = `
            <div class="comment"><p style="color:#8e8e8e;font-style:italic;">No comments to display</p></div>
        `;
    }

    // Update QR code
    generateQRCode(url);

    // Update footer URL
    const shortUrl = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    document.getElementById('poster-url').textContent = shortUrl;
}

/**
 * Generate QR code for the URL
 */
function generateQRCode(url) {
    const qrContainer = document.getElementById('qr-code');
    qrContainer.innerHTML = '';

    if (qrCodeInstance) {
        qrCodeInstance = null;
    }

    try {
        qrCodeInstance = new QRCode(qrContainer, {
            text: url,
            width: 80,
            height: 80,
            colorDark: '#262626',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('QR Code generation failed:', error);
        qrContainer.innerHTML = '<div style="width:80px;height:80px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">QR Code</div>';
    }
}

/**
 * Get the appropriate background color for html2canvas based on active theme
 */
function getExportBackgroundColor() {
    const poster = document.getElementById('poster');
    if (poster.classList.contains('theme-dark')) {
        return '#1a1a1a';
    } else if (poster.classList.contains('theme-gradient')) {
        // For gradient themes, let html2canvas capture the element's own rendering
        return null;
    }
    return '#ffffff';
}

/**
 * Download the poster as a PNG image
 */
async function downloadPoster() {
    const poster = document.getElementById('poster');
    const downloadBtn = document.querySelector('.download-btn');

    downloadBtn.textContent = 'Preparing download...';
    downloadBtn.disabled = true;

    try {
        // Wait for QR code to render
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(poster, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: getExportBackgroundColor(),
            logging: false
        });

        // Create download link
        const link = document.createElement('a');
        link.download = `instagram-poster-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download poster. Please try again.');
    } finally {
        downloadBtn.textContent = 'Download as Image';
        downloadBtn.disabled = false;
    }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    const cleaned = String(num).replace(/[^0-9]/g, '');
    return Number(cleaned).toLocaleString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Apply the selected theme to the poster
 */
function applyTheme() {
    const poster = document.getElementById('poster');
    const themeSelect = document.getElementById('theme-select');
    const selectedTheme = themeSelect.value;

    // Remove existing theme classes
    poster.classList.remove('theme-dark', 'theme-gradient');

    // Apply the selected theme class (light is the default, no class needed)
    if (selectedTheme === 'dark') {
        poster.classList.add('theme-dark');
    } else if (selectedTheme === 'gradient') {
        poster.classList.add('theme-gradient');
    }
}

/**
 * Copy the poster as an image to the clipboard
 */
async function copyToClipboard() {
    const poster = document.getElementById('poster');
    const copyBtn = document.querySelector('.copy-btn');

    copyBtn.textContent = 'Copying...';
    copyBtn.disabled = true;

    try {
        // Wait for QR code to render
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(poster, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: getExportBackgroundColor(),
            logging: false
        });

        // Convert canvas to blob and copy to clipboard
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(function(b) {
                if (b) {
                    resolve(b);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            }, 'image/png');
        });

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy to Clipboard';
            copyBtn.disabled = false;
        }, 2000);
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        alert('Failed to copy to clipboard. Your browser may not support this feature.');
        copyBtn.textContent = 'Copy to Clipboard';
        copyBtn.disabled = false;
    }
}

/**
 * Initialize the page with a default QR code
 */
function init() {
    generateQRCode('https://www.instagram.com');
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
