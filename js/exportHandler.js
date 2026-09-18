// Export Handler — Export newsletter as PNG/JPG or print

/**
 * Fetch an image URL as a blob and return a same-origin object URL.
 * Object URLs are always same-origin, so drawing them on a canvas
 * will never taint it — completely bypassing CORS canvas restrictions.
 */
async function fetchAsObjectUrl(src) {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    // If direct fetch fails (e.g. CORS), fallback to a public CORS proxy
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(src)}`;
    try {
      const proxyRes = await fetch(proxyUrl);
      if (!proxyRes.ok) throw new Error('Proxy fetch failed');
      const proxyBlob = await proxyRes.blob();
      return URL.createObjectURL(proxyBlob);
    } catch (proxyErr) {
      // Fallback 2 if corsproxy.io fails
      const proxy2Url = `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`;
      const proxy2Res = await fetch(proxy2Url);
      const proxy2Blob = await proxy2Res.blob();
      return URL.createObjectURL(proxy2Blob);
    }
  }
}

/**
 * Load an image from a URL via blob fetch (same-origin safe).
 * Returns { img, objectUrl } or null on failure.
 */
async function loadCleanImage(src) {
  try {
    const objectUrl = await fetchAsObjectUrl(src);
    const img = new Image();
    img.src = objectUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return { img, objectUrl };
  } catch {
    return null;
  }
}

/**
 * Pre-process images: html2canvas does NOT support object-fit properly,
 * so we temporarily replace each <img> with an inline canvas that
 * has the correct cropping baked in, then restore after capture.
 */
async function prepareImagesForExport(container) {
  const images = container.querySelectorAll('.nl-photo-item img, .nl-logo img');
  const restoreFns = [];
  const objectUrls = []; // track for cleanup

  for (const img of images) {
    if (!img.naturalWidth) continue;

    const rect = img.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;

    // Load a clean, same-origin copy via blob fetch
    const result = await loadCleanImage(img.src);
    if (!result) continue; // skip if fetch fails

    const { img: cleanImg, objectUrl } = result;
    objectUrls.push(objectUrl);

    const nw = cleanImg.naturalWidth;
    const nh = cleanImg.naturalHeight;

    // Calculate object-fit: cover crop
    const containerRatio = cw / ch;
    const imageRatio = nw / nh;
    let sx, sy, sw, sh;

    if (imageRatio > containerRatio) {
      // Image is wider → crop sides
      sh = nh;
      sw = nh * containerRatio;
      sx = (nw - sw) / 2;
      sy = 0;
    } else {
      // Image is taller → crop top/bottom
      sw = nw;
      sh = nw / containerRatio;
      sx = 0;
      sy = (nh - sh) / 2;
    }

    // Draw cropped version onto a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = cw * 2;  // 2x for high-res export
    canvas.height = ch * 2;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.style.display = 'block';
    canvas.style.borderRadius = getComputedStyle(img).borderRadius;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(cleanImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // Swap img → canvas
    const parent = img.parentNode;
    parent.replaceChild(canvas, img);

    restoreFns.push(() => parent.replaceChild(img, canvas));
  }

  return () => {
    restoreFns.forEach(fn => fn());
    objectUrls.forEach(url => URL.revokeObjectURL(url));
  };
}

/**
 * Replace all <img> src attributes in a container with same-origin
 * blob object URLs so html2canvas won't encounter CORS issues.
 */
async function replaceImgSrcsWithBlobs(container) {
  const images = container.querySelectorAll('img');
  const restoreFns = [];

  for (const img of images) {
    const originalSrc = img.src;
    // Only process cross-origin URLs (skip data: and blob: URLs)
    if (!originalSrc || originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) continue;

    try {
      const objectUrl = await fetchAsObjectUrl(originalSrc);
      img.src = objectUrl;
      restoreFns.push(() => {
        URL.revokeObjectURL(objectUrl);
        img.src = originalSrc;
      });
    } catch {
      // If fetch fails, leave original src
    }
  }

  return () => restoreFns.forEach(fn => fn());
}

export async function exportAsImage(format = 'png') {
  const page = document.getElementById('nl-page');
  if (!page) return;

  showLoading('กำลังส่งออก...');
  let restoreImages = null;
  let restoreImgSrcs = null;
  let originalBg = '';
  const isCustomBg = page.classList.contains('has-bg');

  try {
    if (isCustomBg) {
      originalBg = page.style.backgroundImage;
      page.style.backgroundImage = 'none'; // hide it from html2canvas
    }

    // Pre-process images to preserve aspect ratios
    restoreImages = await prepareImagesForExport(page);

    // Replace any remaining <img> src with same-origin blob URLs
    restoreImgSrcs = await replaceImgSrcsWithBlobs(page);

    // Dynamically import html2canvas
    const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');

    const contentCanvas = await html2canvas(page, {
      scale: 3, // Ultra-high resolution (3x)
      useCORS: true,
      allowTaint: false,
      backgroundColor: isCustomBg ? null : '#ffffff',
      width: page.scrollWidth,
      height: page.scrollHeight,
      logging: false,
    });

    let finalCanvas = contentCanvas;

    if (isCustomBg && originalBg) {
      // Extract URL from 'url("...")'
      const urlMatch = originalBg.match(/url\(['"]?(.*?)['"]?\)/);
      if (urlMatch && urlMatch[1]) {
        const bgUrl = urlMatch[1];

        // Load background image via blob fetch (same-origin safe)
        const result = await loadCleanImage(bgUrl);
        if (result) {
          const { img, objectUrl } = result;

          try {
            finalCanvas = document.createElement('canvas');
            finalCanvas.width = contentCanvas.width;
            finalCanvas.height = contentCanvas.height;
            const ctx = finalCanvas.getContext('2d');

            // Draw background (cover)
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const canvasRatio = finalCanvas.width / finalCanvas.height;
            let sx, sy, sw, sh;
            if (imgRatio > canvasRatio) {
              sh = img.naturalHeight;
              sw = img.naturalHeight * canvasRatio;
              sx = (img.naturalWidth - sw) / 2;
              sy = 0;
            } else {
              sw = img.naturalWidth;
              sh = img.naturalWidth / canvasRatio;
              sx = 0;
              sy = (img.naturalHeight - sh) / 2;
            }
            
            // Use high quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, finalCanvas.width, finalCanvas.height);
            
            // Draw content on top
            ctx.drawImage(contentCanvas, 0, 0);
          } catch (imgErr) {
            console.error("Failed to composite background for export", imgErr);
            finalCanvas = contentCanvas; // fallback
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        }
      }
    }

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'png' ? 1 : 0.92;
    const dataUrl = finalCanvas.toDataURL(mimeType, quality);

    // Download
    const link = document.createElement('a');
    link.download = `วารสาร_${new Date().toISOString().slice(0, 10)}.${format}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('ส่งออกสำเร็จ!', 'success');
  } catch (err) {
    console.error('Export error:', err);
    showToast('เกิดข้อผิดพลาดในการส่งออก', 'error');
  } finally {
    if (restoreImgSrcs) restoreImgSrcs();
    if (restoreImages) restoreImages();
    if (isCustomBg) {
      page.style.backgroundImage = originalBg;
    }
    hideLoading();
  }
}

export function printNewsletter() {
  const page = document.getElementById('nl-page');
  if (!page) return;

  const printWindow = window.open('', '_blank');
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>พิมพ์วารสาร</title>
      ${styles}
      <style>
        body { margin: 0; padding: 0; background: white; }
        .nl-page { box-shadow: none !important; margin: 0 auto; }
        @media print {
          .nl-page { width: 100% !important; min-height: auto !important; }
        }
      </style>
    </head>
    <body>${page.outerHTML}</body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

let isInitialized = false;

export function initExport() {
  if (isInitialized) return;

  const exportBtn = document.getElementById('btn-export');
  const modal = document.getElementById('export-modal');
  const closeBtn = document.getElementById('export-modal-close');
  const pngBtn = document.getElementById('export-png');
  const jpgBtn = document.getElementById('export-jpg');
  const printBtn = document.getElementById('export-print');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }

  // Close on overlay click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  if (pngBtn) {
    pngBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      exportAsImage('png');
    });
  }

  if (jpgBtn) {
    jpgBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      exportAsImage('jpg');
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      printNewsletter();
    });
  }
  
  isInitialized = true;
}

function showLoading(text) {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  if (overlay) overlay.style.display = 'flex';
  if (loadingText) loadingText.textContent = text;
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
