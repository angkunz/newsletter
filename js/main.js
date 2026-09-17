// Main — App initialization, routing, and orchestration

import { api } from './api.js';
import { applyTemplate, templates } from './templates.js';
import { initEditor, updateEditorData, getCurrentData } from './editor.js';
import { updatePreview, initZoom, initDraggables, onBackgroundModeChange } from './preview.js';
import { initImageHandler, setPhotos, loadImageData, getPhotos } from './imageHandler.js';
import { initExport } from './exportHandler.js';

window.updateEditorData = updateEditorData;

// === State ===
let currentNewsletterId = null;
let autoSaveTimer = null;
let hasUnsavedChanges = false;
let cachedNewsletters = [];

// === App Init ===
document.addEventListener('DOMContentLoaded', () => {
  setupRouting();
  loadDashboard();
});

// === Routing ===
function setupRouting() {
  // Create new
  document.getElementById('btn-create-new')?.addEventListener('click', createNewNewsletter);

  // Back button
  document.getElementById('btn-back')?.addEventListener('click', () => {
    if (hasUnsavedChanges) saveNewsletter();
    showView('dashboard');
    loadDashboard();
  });

  // Save button
  document.getElementById('btn-save')?.addEventListener('click', saveNewsletter);

  // Search
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    filterNewsletters(e.target.value);
  });

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    let sorted = [...cachedNewsletters];
    if (val === 'oldest') {
      sorted = sorted.reverse(); // Assuming API returns newest first
    }
    renderDashboard(sorted);
    // Re-apply search filter if any
    const query = document.getElementById('search-input')?.value;
    if (query) filterNewsletters(query);
  });

  // Delete modal
  document.getElementById('delete-cancel')?.addEventListener('click', () => {
    document.getElementById('delete-modal').style.display = 'none';
  });
  document.getElementById('delete-modal-close')?.addEventListener('click', () => {
    document.getElementById('delete-modal').style.display = 'none';
  });
}

function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${view}-view`)?.classList.add('active');
}

// === Dashboard ===
async function loadDashboard() {
  try {
    const newsletters = await api.getAll();
    cachedNewsletters = newsletters;
    // Apply current sort state if necessary
    const sortVal = document.getElementById('sort-select')?.value;
    let toRender = [...cachedNewsletters];
    if (sortVal === 'oldest') toRender = toRender.reverse();
    renderDashboard(toRender);
    // Apply current search
    const query = document.getElementById('search-input')?.value;
    if (query) filterNewsletters(query);
  } catch (err) {
    console.error('Load dashboard error:', err);
    showToast('ไม่สามารถโหลดข้อมูลได้: ' + err.message, 'error');
    renderDashboard([]);
  }
}

function renderDashboard(newsletters) {
  const grid = document.getElementById('newsletters-grid');
  const empty = document.getElementById('empty-state');

  if (!newsletters || newsletters.length === 0) {
    grid.style.display = 'none';
    empty.style.display = '';
    return;
  }

  grid.style.display = '';
  empty.style.display = 'none';

  grid.innerHTML = newsletters.map((nl, i) => {
    const template = templates[nl.template] || templates.classic;
    const firstPhoto = nl.photos && nl.photos.length > 0 ? nl.photos[0] : null;
    const dateStr = nl.updated_at
      ? new Date(nl.updated_at).toLocaleDateString('th-TH', {
          year: 'numeric', month: 'short', day: 'numeric'
        })
      : '';

    return `
      <div class="newsletter-card" data-id="${nl.id}" style="animation: cardIn 0.4s ease ${i * 0.08}s both;">
        <div class="card-preview" style="background: ${template.colors.gradient}">
          ${firstPhoto ? `<img src="${firstPhoto}" alt="${nl.title}" />` : `
            <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
              <rect x="12" y="8" width="40" height="48" rx="4" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
              <path d="M20 20h24M20 28h18M20 36h20M20 44h12" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `}
          <div class="card-template-badge" style="background: ${nl.background_url ? 'linear-gradient(135deg, #10b981, #059669)' : template.colors.gradient}">
            ${nl.background_url ? '🖼️ พื้นหลังกำหนดเอง' : template.name}
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">${nl.headline || nl.title || 'วารสารใหม่'}</div>
          <div class="card-meta">
            <span>${nl.issue_number ? `ฉบับ ${nl.issue_number}` : 'ยังไม่ระบุฉบับ'}</span>
            <span>•</span>
            <span>${dateStr}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.appDuplicate(${nl.id})" title="ทำสำเนา">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.appDelete(${nl.id})" title="ลบ" style="color: var(--accent-red);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Click to edit
  grid.querySelectorAll('.newsletter-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      openEditor(id);
    });
  });
}

function filterNewsletters(query) {
  const cards = document.querySelectorAll('.newsletter-card');
  const q = query.toLowerCase();
  cards.forEach(card => {
    const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
    const meta = card.querySelector('.card-meta')?.textContent.toLowerCase() || '';
    card.style.display = (title.includes(q) || meta.includes(q)) ? '' : 'none';
  });
}

// === Create New ===
async function createNewNewsletter() {
  try {
    const newsletter = await api.create({ title: 'วารสารใหม่' });
    openEditor(newsletter.id);
    showToast('สร้างวารสารใหม่เรียบร้อย', 'success');
  } catch (err) {
    showToast('ไม่สามารถสร้างวารสารได้: ' + err.message, 'error');
  }
}

// === Open Editor ===
async function openEditor(id) {
  try {
    const data = await api.getOne(id);
    currentNewsletterId = id;
    hasUnsavedChanges = false;

    showView('editor');

    // Apply template
    applyTemplate(data.template || 'classic');

    // Init editor fields
    initEditor(data, (key, value) => {
      hasUnsavedChanges = true;
      scheduleAutoSave();
    });

    // Init image handler
    initImageHandler((type, value) => {
      hasUnsavedChanges = true;
      if (type === 'background') {
        updateEditorData('background_url', value);
      } else if (type === 'logo_left') {
        updateEditorData('logo_left_url', value);
      } else if (type === 'logo_right') {
        updateEditorData('logo_right_url', value);
      } else if (type === 'photos') {
        updateEditorData('photos', value);
      }
      scheduleAutoSave();
    });

    // Load existing images
    loadImageData(data);
    setPhotos(data.photos || []);

    // Init preview
    updatePreview(data);
    initZoom();
    initDraggables(
      (x, y) => {
        updateEditorData('issue_pos_x', x);
        updateEditorData('issue_pos_y', y);
        hasUnsavedChanges = true;
        scheduleAutoSave();
      },
      (x, y) => {
        updateEditorData('headline_pos_x', x);
        updateEditorData('headline_pos_y', y);
        hasUnsavedChanges = true;
        scheduleAutoSave();
      }
    );

    // Init export
    initExport();

    // Template switching
    setupTemplateSwitch();

    // Background mode: hide template-only sidebar sections when background is uploaded
    onBackgroundModeChange((hasBg) => {
      toggleTemplateSections(!hasBg);
    });
    // Apply initial state
    toggleTemplateSections(!data.background_url);

    updateSaveStatus('saved');
  } catch (err) {
    showToast('ไม่สามารถเปิดวารสารได้: ' + err.message, 'error');
  }
}

let isTemplateSwitchInitialized = false;

function setupTemplateSwitch() {
  if (isTemplateSwitchInitialized) return;
  
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const templateId = card.dataset.template;
      applyTemplate(templateId);
      updateEditorData('template', templateId);
      hasUnsavedChanges = true;
      scheduleAutoSave();
    });
  });
  
  isTemplateSwitchInitialized = true;
}

// === Toggle Template Sections ===
// When background is uploaded, these sidebar sections are hidden
// because the background already contains all that info
function toggleTemplateSections(show) {
  const sectionsToToggle = ['template', 'logos', 'org', 'footer'];
  sectionsToToggle.forEach(name => {
    const section = document.querySelector(`.editor-section[data-section="${name}"]`);
    if (section) {
      section.style.display = show ? '' : 'none';
    }
  });
}

// === Auto Save ===
function scheduleAutoSave() {
  updateSaveStatus('saving');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveNewsletter, 3000);
}

async function saveNewsletter() {
  if (!currentNewsletterId) return;
  clearTimeout(autoSaveTimer);

  try {
    const data = getCurrentData();
    data.photos = getPhotos();
    await api.update(currentNewsletterId, data);
    hasUnsavedChanges = false;
    updateSaveStatus('saved');
  } catch (err) {
    console.error('Save error:', err);
    updateSaveStatus('error');
    showToast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
  }
}

function updateSaveStatus(status) {
  const statusEl = document.getElementById('auto-save-status');
  if (!statusEl) return;

  const dot = statusEl.querySelector('.status-dot');
  const text = statusEl.querySelector('span:last-child');

  switch (status) {
    case 'saving':
      dot.className = 'status-dot saving';
      text.textContent = 'กำลังบันทึก...';
      break;
    case 'saved':
      dot.className = 'status-dot';
      text.textContent = 'บันทึกแล้ว';
      break;
    case 'error':
      dot.className = 'status-dot';
      dot.style.background = 'var(--accent-red)';
      text.textContent = 'บันทึกไม่สำเร็จ';
      break;
  }
}

// === Delete ===
let deleteTargetId = null;

window.appDelete = (id) => {
  deleteTargetId = id;
  document.getElementById('delete-modal').style.display = 'flex';
};

document.getElementById('delete-confirm')?.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  try {
    await api.delete(deleteTargetId);
    document.getElementById('delete-modal').style.display = 'none';
    showToast('ลบวารสารเรียบร้อย', 'success');
    loadDashboard();
  } catch (err) {
    showToast('ลบไม่สำเร็จ: ' + err.message, 'error');
  }
});

// === Duplicate ===
window.appDuplicate = async (id) => {
  try {
    await api.duplicate(id);
    showToast('ทำสำเนาเรียบร้อย', 'success');
    loadDashboard();
  } catch (err) {
    showToast('ทำสำเนาไม่สำเร็จ: ' + err.message, 'error');
  }
};

// === Toast ===
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
