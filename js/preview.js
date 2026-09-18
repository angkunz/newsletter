// Preview — Live preview rendering for the newsletter

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Track background mode so other modules can react
let _hasBackground = false;
let _onBackgroundModeChange = null;

export function isBackgroundMode() {
  return _hasBackground;
}

export function onBackgroundModeChange(callback) {
  _onBackgroundModeChange = callback;
}

export function updatePreview(data) {
  if (!data) return;

  // === Background (process first to determine mode) ===
  const page = document.getElementById('nl-page');
  const hadBg = _hasBackground;
  if (page) {
    if (data.background_url) {
      page.style.backgroundImage = `url(${data.background_url})`;
      page.classList.add('has-bg');
      _hasBackground = true;
    } else {
      page.style.backgroundImage = '';
      page.classList.remove('has-bg');
      _hasBackground = false;
    }
  }

  // Notify sidebar to show/hide template-only sections
  if (hadBg !== _hasBackground && _onBackgroundModeChange) {
    _onBackgroundModeChange(_hasBackground);
  }

  // === Template-mode only elements (skip update if background is set) ===
  if (!_hasBackground) {
    // Organization name
    const orgName = document.getElementById('nl-org-name');
    if (orgName) orgName.textContent = data.org_name || 'ข่าวประชาสัมพันธ์';

    // Website
    const website = document.getElementById('nl-website-display');
    if (website) {
      const span = website.querySelector('span');
      if (span) span.textContent = data.website || 'www.example.ac.th';
      website.style.display = data.website ? 'flex' : 'none';
    }

    // Phone
    const phone = document.getElementById('nl-phone-display');
    if (phone) {
      const span = phone.querySelector('span');
      if (span) span.textContent = data.phone || '0XX-XXXXXXX';
      phone.style.display = data.phone ? 'flex' : 'none';
    }

    // Logos
    updateLogo('left', data.logo_left_url);
    updateLogo('right', data.logo_right_url);

    // Footer
    const footerOrg = document.getElementById('nl-footer-org');
    if (footerOrg) footerOrg.textContent = data.org_name || 'ชื่อองค์กร';

    const footerAddr = document.getElementById('nl-footer-addr');
    if (footerAddr) footerAddr.textContent = data.footer_address || 'ที่อยู่';

    const footerEditor = document.getElementById('nl-footer-editor');
    if (footerEditor) {
      footerEditor.textContent = data.footer_editor
        ? `บรรณาธิการ : ${data.footer_editor}`
        : 'บรรณาธิการ : -';
    }

    const footerResponsible = document.getElementById('nl-footer-responsible');
    if (footerResponsible) {
      footerResponsible.textContent = data.footer_responsible
        ? `ผู้รับผิดชอบ : ${data.footer_responsible}`
        : '';
    }

    const footerReporter = document.getElementById('nl-footer-reporter');
    if (footerReporter) {
      footerReporter.textContent = data.footer_reporter
        ? `ข่าวประชาสัมพันธ์ : ${data.footer_reporter}`
        : '';
    }
  }

  // === Always-visible elements (photos, headline, body, issue info) ===

  // Issue number
  const issueNum = document.getElementById('nl-issue-num');
  if (issueNum) issueNum.textContent = data.issue_number || '--';

  // Issue date
  const issueDt = document.getElementById('nl-issue-dt');
  if (issueDt) {
    issueDt.textContent = data.issue_date ? formatThaiDate(data.issue_date) : '--';
  }
  
  // Issue badge position
  const badge = document.getElementById('nl-issue-badge');
  if (badge) {
    if (data.issue_pos_x) badge.style.left = data.issue_pos_x;
    else badge.style.left = '';
    
    if (data.issue_pos_y) badge.style.top = data.issue_pos_y;
    else badge.style.top = '';
  }

  // Photos
  updatePhotoGrid(data.photos || [], data.photo_layout || 'standard');

  // Headline
  const headline = document.getElementById('nl-headline');
  if (headline) {
    const span = headline.querySelector('span');
    if (span) {
      span.textContent = data.headline || 'หัวข้อข่าวพาดหน้า';
    } else {
      headline.textContent = data.headline || 'หัวข้อข่าวพาดหน้า';
    }
    if (data.headline_size) headline.style.fontSize = `${data.headline_size}px`;
    if (data.headline_align) headline.style.textAlign = data.headline_align;
    
    if (data.headline_pos_x && data.headline_pos_y) {
      headline.style.position = 'absolute';
      headline.style.left = data.headline_pos_x;
      headline.style.top = data.headline_pos_y;
      headline.style.transform = 'none';
      headline.style.margin = '0';
    } else {
      headline.style.position = '';
      headline.style.left = '';
      headline.style.top = '';
      headline.style.transform = '';
      headline.style.margin = '';
    }
  }

  // Body text
  const body = document.getElementById('nl-body');
  if (body) {
    if (data.body_text) {
      body.innerHTML = data.body_text
        .split('\n')
        .filter(line => line.trim())
        .map(line => `<p>${line}</p>`)
        .join('');
    } else {
      body.innerHTML = '<p>เนื้อหาข่าวสาร...</p>';
    }
    if (data.body_size) body.style.fontSize = `${data.body_size}px`;
  }
}

function updateLogo(side, url) {
  const el = document.getElementById(`nl-logo-${side}`);
  if (!el) return;
  if (url) {
    el.innerHTML = `<img src="${url}" alt="โลโก้${side === 'left' ? 'ซ้าย' : 'ขวา'}" crossorigin="anonymous" />`;
  } else {
    el.innerHTML = '';
  }
}

function updatePhotoGrid(photos, layout = 'standard') {
  const grid = document.getElementById('nl-photo-grid');
  if (!grid) return;

  if (!photos || photos.length === 0) {
    grid.className = `nl-photo-grid layout-${layout}`;
    grid.innerHTML = `
      <div class="nl-photo-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
        <span>อัปโหลดรูปภาพ</span>
      </div>
    `;
    return;
  }

  const count = photos.length;
  grid.className = `nl-photo-grid has-photos layout-${layout} grid-${count}`;
  grid.innerHTML = photos.map((url, i) => `
    <div class="nl-photo-item">
      <img src="${url}" alt="รูปที่ ${i + 1}" loading="lazy" crossorigin="anonymous" />
    </div>
  `).join('');
}

function formatThaiDate(dateStr) {
  if (!dateStr) return '--';
  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = THAI_MONTHS[date.getMonth()];
    const year = date.getFullYear() + 543; // Buddhist Era
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

// Zoom controls
let currentZoom = 1;
let isZoomInitialized = false;

export function initZoom() {
  if (isZoomInitialized) return;
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const zoomFit = document.getElementById('zoom-fit');
  const zoomLevel = document.getElementById('zoom-level');
  const canvas = document.getElementById('preview-canvas');

  if (!canvas) return;

  function setZoom(level) {
    currentZoom = Math.max(0.3, Math.min(2, level));
    canvas.style.transform = `scale(${currentZoom})`;
    if (zoomLevel) zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  if (zoomIn) zoomIn.addEventListener('click', () => setZoom(currentZoom + 0.1));
  if (zoomOut) zoomOut.addEventListener('click', () => setZoom(currentZoom - 0.1));
  if (zoomFit) {
    zoomFit.addEventListener('click', () => {
      const container = document.getElementById('preview-container');
      if (!container) return;
      const containerWidth = container.clientWidth - 60;
      const pageWidth = 794;
      setZoom(Math.min(containerWidth / pageWidth, 1));
    });
  }

  // Auto fit on load
  setTimeout(() => {
    if (zoomFit) zoomFit.click();
  }, 100);
  
  isZoomInitialized = true;
}

// Drag and drop for issue badge
let isDraggableInitialized = false;

export function initDraggables(onMoveBadge, onMoveHeadline) {
  if (isDraggableInitialized) return;
  const page = document.getElementById('nl-page');
  
  if (!page) return;
  
  function setupDrag(elementId, onMoveCallback) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let isDragging = false;
    let startX, startY;
    
    el.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = el.getBoundingClientRect();
      
      // Calculate start offsets in scaled space
      startX = (e.clientX - rect.left) / currentZoom;
      startY = (e.clientY - rect.top) / currentZoom;
      
      el.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const pageRect = page.getBoundingClientRect();
      
      let left = ((e.clientX - pageRect.left) / currentZoom) - startX;
      let top = ((e.clientY - pageRect.top) / currentZoom) - startY;
      
      // Constrain to page bounds
      left = Math.max(0, Math.min(left, page.clientWidth - el.clientWidth));
      top = Math.max(0, Math.min(top, page.clientHeight - el.clientHeight));
      
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.transform = 'none'; // Clear translate for headline
      el.style.position = 'absolute'; // Ensure it's absolute
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        el.style.cursor = 'grab';
        
        if (elementId === 'nl-headline' && page.classList.contains('has-bg')) {
          const photoGrid = document.getElementById('nl-photo-grid');
          if (photoGrid) {
            const gridRect = photoGrid.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            // Snap if dropped near the bottom of photo grid or below it
            if (elRect.top > gridRect.bottom - 60) {
              el.style.position = '';
              el.style.left = '';
              el.style.top = '';
              el.style.transform = '';
              el.style.margin = '';
              if (onMoveCallback) onMoveCallback('', '');
              return;
            }
          }
        }
        
        if (onMoveCallback) onMoveCallback(el.style.left, el.style.top);
      }
    });
    
    el.style.cursor = 'grab';
    el.title = 'ลากเพื่อย้ายตำแหน่ง';
  }
  
  setupDrag('nl-issue-badge', onMoveBadge);
  setupDrag('nl-headline', onMoveHeadline);
  
  isDraggableInitialized = true;
}
