// Editor — Sidebar controls logic

import { updatePreview } from './preview.js';

let currentData = {};
let onDataChange = null;
let isInitialized = false;

export function initEditor(data, onChange) {
  currentData = { ...data };
  onDataChange = onChange;

  populateFields(data);
  
  if (!isInitialized) {
    setupSectionToggles();
    setupFieldListeners();
    isInitialized = true;
  }
}

export function getCurrentData() {
  return { ...currentData };
}

function setupSectionToggles() {
  document.querySelectorAll('.section-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const content = toggle.nextElementSibling;
      const isOpen = content.classList.contains('open');

      toggle.classList.toggle('active', !isOpen);
      content.classList.toggle('open', !isOpen);
    });
  });
}

function populateFields(data) {
  if (!data) return;

  setVal('org-name', data.org_name);
  setVal('org-website', data.website);
  setVal('org-phone', data.phone);
  setVal('issue-number', data.issue_number);
  setVal('issue-date', data.issue_date);
  setVal('headline', data.headline);
  setVal('body-text', data.body_text);
  setVal('footer-editor', data.footer_editor);
  setVal('footer-responsible', data.footer_responsible);
  setVal('footer-reporter', data.footer_reporter);
  setVal('footer-address', data.footer_address);
  setVal('photo-layout', data.photo_layout || 'standard');
  
  setVal('headline-size', data.headline_size || 26);
  if (document.getElementById('headline-size-val')) {
    document.getElementById('headline-size-val').textContent = data.headline_size || 26;
  }
  
  setVal('body-size', data.body_size || 14);
  if (document.getElementById('body-size-val')) {
    document.getElementById('body-size-val').textContent = data.body_size || 14;
  }
  
  document.querySelectorAll('.btn-align').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.align === (data.headline_align || 'center'));
  });
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.value = value;
  }
}

function setupFieldListeners() {
  const fieldMap = {
    'org-name': 'org_name',
    'org-website': 'website',
    'org-phone': 'phone',
    'issue-number': 'issue_number',
    'issue-date': 'issue_date',
    'headline': 'headline',
    'body-text': 'body_text',
    'footer-editor': 'footer_editor',
    'footer-responsible': 'footer_responsible',
    'footer-reporter': 'footer_reporter',
    'footer-address': 'footer_address',
    'photo-layout': 'photo_layout'
  };

  for (const [elementId, dataKey] of Object.entries(fieldMap)) {
    const el = document.getElementById(elementId);
    if (!el) continue;

    el.addEventListener('input', () => {
      updateEditorData(dataKey, el.value);
    });
  }

  // Font sizes
  const headlineSize = document.getElementById('headline-size');
  if (headlineSize) {
    headlineSize.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (document.getElementById('headline-size-val')) {
        document.getElementById('headline-size-val').textContent = val;
      }
      updateEditorData('headline_size', val);
    });
  }

  const bodySize = document.getElementById('body-size');
  if (bodySize) {
    bodySize.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (document.getElementById('body-size-val')) {
        document.getElementById('body-size-val').textContent = val;
      }
      updateEditorData('body_size', val);
    });
  }

  // Alignment buttons
  document.querySelectorAll('.btn-align').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(`.btn-align[data-target="${btn.dataset.target}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.target === 'headline') {
        updateEditorData('headline_align', btn.dataset.align);
      }
    });
  });
}

export function updateEditorData(key, value) {
  currentData[key] = value;
  updatePreview(currentData);
}
