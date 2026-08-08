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
 * Show feedback to the user about what data was automatically fetched
 * @param {string[]} fetchedFields - Array of field names that were successfully fetched
 */
function showFetchFeedback(fetchedFields) {
    // Remove any existing feedback element
    const existingFeedback = document.getElementById('fetch-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    const feedbackEl = document.createElement('div');
    feedbackEl.id = 'fetch-feedback';
    feedbackEl.style.cssText = 'padding: 10px 15px; border-radius: 8px; margin-top: 10px; font-size: 0.85rem; line-height: 1.4;';

    if (fetchedFields.length === 0) {
        // No data was fetched
        feedbackEl.style.backgroundColor = '#fff3cd';
        feedbackEl.style.color = '#856404';
        feedbackEl.style.border = '1px solid #ffc107';
        const strong = document.createElement('strong');
        strong.textContent = 'Auto-fetch was unable to retrieve data.';
        feedbackEl.appendChild(strong);
        feedbackEl.appendChild(document.createTextNode(' Instagram may be blocking requests. Please fill in the fields manually (username, caption, image URL) and click "Update Poster".'));
    } else if (fetchedFields.length < 3) {
        // Partial data fetched
        const missing = ['username', 'caption', 'image'].filter(f => !fetchedFields.includes(f));
        feedbackEl.style.backgroundColor = '#d1ecf1';
        feedbackEl.style.color = '#0c5460';
        feedbackEl.style.border = '1px solid #bee5eb';
        const strong = document.createElement('strong');
        strong.textContent = 'Partially auto-filled!';
        feedbackEl.appendChild(strong);
        feedbackEl.appendChild(document.createTextNode(' Fetched: ' + fetchedFields.join(', ') + '. Please manually enter: ' + missing.join(', ') + '.'));
    } else {
        // All data fetched
        feedbackEl.style.backgroundColor = '#d4edda';
        feedbackEl.style.color = '#155724';
        feedbackEl.style.border = '1px solid #c3e6cb';
        const strong = document.createElement('strong');
        strong.textContent = 'Successfully auto-filled!';
        feedbackEl.appendChild(strong);
        feedbackEl.appendChild(document.createTextNode(' All available data was fetched from Instagram.'));
    }

    // Insert feedback after the generate button area
    const btn = document.getElementById('generate-btn');
    const parent = btn.parentElement;
    parent.insertAdjacentElement('afterend', feedbackEl);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (feedbackEl.parentElement) {
            feedbackEl.style.transition = 'opacity 0.5s';
            feedbackEl.style.opacity = '0';
            setTimeout(() => feedbackEl.remove(), 500);
        }
    }, 10000);
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
        // Try fetching data via Instagram CORS proxy
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

            // Provide user feedback about fetch results
            showFetchFeedback(postData.fetchedFields || []);
        }

        // Update poster with whatever data we have
        updatePosterFromData(url);

    } catch (error) {
        console.error('Error fetching Instagram data:', error);
        // Still update poster with the URL for QR code
        updatePosterFromData(url);
        showFetchFeedback([]);
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
 * Validate that an image URL is a safe Instagram CDN URL
 * Only allows https:// URLs from known Instagram/Facebook CDN domains
 */
function isValidInstagramImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        const hostname = parsed.hostname;
        // Allow known Instagram/Facebook CDN domains
        const allowedPatterns = [
            /^scontent.*\.cdninstagram\.com$/,
            /^instagram\..+\.fna\.fbcdn\.net$/,
            /^scontent.*\.fbcdn\.net$/,
            /^.*\.cdninstagram\.com$/,
            /^.*\.fbcdn\.net$/
        ];
        return allowedPatterns.some(pattern => pattern.test(hostname));
    } catch (e) {
        return false;
    }
}

/**
 * List of CORS proxy services to try in order
 */
const CORS_PROXIES = [
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
];

/**
 * Attempt to fetch a URL through multiple CORS proxy services in parallel
 * Uses Promise.any to race all proxies and return the first successful response
 * Returns the response text on success, or null on failure
 */
async function fetchViaCorsProxy(targetUrl) {
    const promises = CORS_PROXIES.map(proxyFn => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const proxyUrl = proxyFn(targetUrl);
        return fetch(proxyUrl, { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            })
            .then(text => {
                if (!text || text.length <= 100) throw new Error('Response too short');
                return text;
            })
            .catch(err => {
                clearTimeout(timeoutId);
                console.warn(`CORS proxy attempt failed for ${targetUrl}:`, err.message);
                throw err;
            });
    });

    try {
        return await Promise.any(promises);
    } catch (err) {
        // All proxies failed
        return null;
    }
}

/**
 * Parse Instagram page HTML to extract post data from meta tags and embedded JSON
 */
function parseInstagramHtml(html) {
    const result = { username: '', caption: '', imageUrl: '' };

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Try og:image meta tag
        const ogImage = doc.querySelector('meta[property="og:image"]');
        if (ogImage && ogImage.getAttribute('content')) {
            result.imageUrl = ogImage.getAttribute('content');
        }

        // Try og:description meta tag (often contains "username: caption")
        const ogDesc = doc.querySelector('meta[property="og:description"]');
        if (ogDesc && ogDesc.getAttribute('content')) {
            const descContent = ogDesc.getAttribute('content');
            // Instagram og:description format is typically: "N Likes, N Comments - @username on Instagram: "caption""
            const usernameMatch = descContent.match(/@([\w.]+)\s+on\s+Instagram/i);
            if (usernameMatch) {
                result.username = usernameMatch[1];
            }
            const captionMatch = descContent.match(/Instagram:\s*["\u201C](.+?)["\u201D]/s);
            if (captionMatch) {
                result.caption = captionMatch[1];
            } else {
                // Fallback: try to grab text after the username part
                const afterUsername = descContent.match(/on\s+Instagram:\s*(.+)/is);
                if (afterUsername) {
                    result.caption = afterUsername[1].replace(/^["'\u201C]+|["'\u201D]+$/g, '').trim();
                }
            }
        }

        // Try to find embedded JSON-LD data
        const ldJsonScripts = doc.querySelectorAll('script[type="application/ld+json"]');
        for (const script of ldJsonScripts) {
            try {
                const jsonData = JSON.parse(script.textContent);
                if (jsonData.author && jsonData.author.alternateName) {
                    result.username = result.username || jsonData.author.alternateName.replace('@', '');
                }
                if (jsonData.caption) {
                    result.caption = result.caption || jsonData.caption;
                }
                if (jsonData.image) {
                    result.imageUrl = result.imageUrl || (Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image);
                }
            } catch (e) {
                // JSON parse failed for this script tag, skip
            }
        }

        // Try to find _sharedData or additional_data in script tags
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.textContent || '';
            // Look for window._sharedData pattern
            const sharedDataMatch = content.match(/window\._sharedData\s*=\s*(\{.+?\});\s*<\/script/s) ||
                                    content.match(/window\._sharedData\s*=\s*(\{.+?\});$/m);
            if (sharedDataMatch) {
                try {
                    const sharedData = JSON.parse(sharedDataMatch[1]);
                    const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                    if (media) {
                        result.username = result.username || media.owner?.username || '';
                        result.caption = result.caption || media.edge_media_to_caption?.edges?.[0]?.node?.text || '';
                        result.imageUrl = result.imageUrl || media.display_url || '';
                    }
                } catch (e) {
                    // JSON parse failed, skip
                }
            }
        }
    } catch (err) {
        console.warn('Error parsing Instagram HTML:', err);
    }

    return result;
}

/**
 * Parse Instagram embed page HTML to extract post data
 */
function parseInstagramEmbed(html) {
    const result = { username: '', caption: '', imageUrl: '' };

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Embed pages often have the username in a specific element
        const usernameEl = doc.querySelector('.UsernameText') ||
                           doc.querySelector('a.FPmhX') ||
                           doc.querySelector('header a');
        if (usernameEl && usernameEl.textContent) {
            result.username = usernameEl.textContent.trim().replace('@', '');
        }

        // Try to get image from the embed
        const img = doc.querySelector('img.EmbeddedMediaImage') ||
                    doc.querySelector('.Content img') ||
                    doc.querySelector('img[srcset]') ||
                    doc.querySelector('img[src*="instagram"]');
        if (img) {
            result.imageUrl = img.getAttribute('src') || '';
        }

        // Caption from embed
        const captionEl = doc.querySelector('.Caption') ||
                          doc.querySelector('div[class*="caption"]') ||
                          doc.querySelector('.CaptionContent');
        if (captionEl && captionEl.textContent) {
            result.caption = captionEl.textContent.trim();
        }

        // Also check for og meta tags in embed page
        const ogImage = doc.querySelector('meta[property="og:image"]');
        if (ogImage && ogImage.getAttribute('content')) {
            result.imageUrl = result.imageUrl || ogImage.getAttribute('content');
        }
    } catch (err) {
        console.warn('Error parsing Instagram embed HTML:', err);
    }

    return result;
}

/**
 * Fetch Instagram post data using CORS proxy services with multiple fallback strategies
 */
async function fetchInstagramData(url) {
    const baseData = extractFromUrl(url);
    const result = { ...baseData };

    try {
        // Strategy 1: Fetch the main Instagram page via CORS proxy
        const pageHtml = await fetchViaCorsProxy(url);
        if (pageHtml) {
            const parsed = parseInstagramHtml(pageHtml);
            if (parsed.username) result.username = parsed.username;
            if (parsed.caption) result.caption = parsed.caption;
            if (parsed.imageUrl) result.imageUrl = parsed.imageUrl;
        }

        // Strategy 2: If we still need data, try the embed endpoint
        if (!result.username || !result.imageUrl) {
            const shortcode = baseData.shortcode;
            if (shortcode) {
                const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
                const embedHtml = await fetchViaCorsProxy(embedUrl);
                if (embedHtml) {
                    const embedParsed = parseInstagramEmbed(embedHtml);
                    if (!result.username && embedParsed.username) result.username = embedParsed.username;
                    if (!result.caption && embedParsed.caption) result.caption = embedParsed.caption;
                    if (!result.imageUrl && embedParsed.imageUrl) result.imageUrl = embedParsed.imageUrl;
                }
            }
        }
    } catch (error) {
        console.error('Error during Instagram data fetch:', error);
    }

    // Set a flag indicating what data was successfully fetched
    result.fetchedFields = [];
    if (result.username) result.fetchedFields.push('username');
    if (result.caption) result.fetchedFields.push('caption');
    if (result.imageUrl) result.fetchedFields.push('image');

    return result;
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
    if (imageUrl && isValidInstagramImageUrl(imageUrl)) {
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
