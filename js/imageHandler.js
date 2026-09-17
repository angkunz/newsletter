// Image Handler — Upload, drag-drop, reorder, and management

import { api } from './api.js';

let photos = [];
let onPhotosChange = null;
let isInitialized = false;

export function initImageHandler(callback) {
  onPhotosChange = callback;
  if (isInitialized) return;

  setupBackgroundUpload();
  setupLogoUpload();
  setupPhotosUpload();
  
  isInitialized = true;
}

export function setPhotos(newPhotos) {
  photos = newPhotos || [];
  renderPhotosList();
}

export function getPhotos() {
  return [...photos];
}

// === Background Upload ===
function setupBackgroundUpload() {
  const zone = document.getElementById('bg-upload-zone');
  const input = document.getElementById('bg-upload');
  const previewWrap = document.getElementById('bg-preview-wrap');
  const previewImg = document.getElementById('bg-preview-img');
  const removeBtn = document.getElementById('bg-remove');
  const spacingControl = document.getElementById('bg-spacing-control');
  const spacingSlider = document.getElementById('bg-top-spacing');
  const spacingValue = document.getElementById('bg-spacing-value');
  const bottomSlider = document.getElementById('bg-bottom-spacing');
  const bottomValue = document.getElementById('bg-bottom-spacing-value');

  if (!zone) return;

  // Initialize spacing control
  if (spacingSlider) {
    spacingSlider.addEventListener('input', (e) => {
      const val = e.target.value + 'px';
      if (spacingValue) spacingValue.textContent = val;
      const page = document.getElementById('nl-page');
      if (page) page.style.setProperty('--bg-top-spacing', val);
      if (window.updateEditorData) window.updateEditorData('bg_top_spacing', val);
    });
  }
  if (bottomSlider) {
    bottomSlider.addEventListener('input', (e) => {
      const val = e.target.value + 'px';
      if (bottomValue) bottomValue.textContent = val;
      const page = document.getElementById('nl-page');
      if (page) page.style.setProperty('--bg-bottom-spacing', val);
      if (window.updateEditorData) window.updateEditorData('bg_bottom_spacing', val);
    });
  }

  zone.addEventListener('click', () => input.click());

  // Drag & Drop
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleBackgroundFile(e.dataTransfer.files[0]);
    }
  });

  input.addEventListener('change', () => {
    if (input.files.length) {
      handleBackgroundFile(input.files[0]);
    }
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    previewWrap.style.display = 'none';
    if (spacingControl) spacingControl.style.display = 'none';
    zone.style.display = '';
    
    // Reset spacing
    const page = document.getElementById('nl-page');
    if (page) {
      page.style.removeProperty('--bg-top-spacing');
      page.style.removeProperty('--bg-bottom-spacing');
    }

    if (onPhotosChange) onPhotosChange('background', '');
  });
}

async function handleBackgroundFile(file) {
  const zone = document.getElementById('bg-upload-zone');
  const previewWrap = document.getElementById('bg-preview-wrap');
  const previewImg = document.getElementById('bg-preview-img');
  const spacingControl = document.getElementById('bg-spacing-control');

  try {
    zone.style.display = 'none';
    previewWrap.style.display = 'block';
    if (spacingControl) spacingControl.style.display = 'block';

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    previewImg.src = localUrl;

    // Upload to server
    const { url } = await api.uploadBackground(file);
    previewImg.src = url;
    if (onPhotosChange) onPhotosChange('background', url);
  } catch (err) {
    zone.style.display = '';
    previewWrap.style.display = 'none';
    if (spacingControl) spacingControl.style.display = 'none';
    showToast(err.message, 'error');
  }
}

// === Logo Upload ===
function setupLogoUpload() {
  ['left', 'right'].forEach(side => {
    const zone = document.getElementById(`logo-${side}-zone`);
    const input = document.getElementById(`logo-${side}-upload`);
    const preview = document.getElementById(`logo-${side}-preview`);

    if (!zone) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        handleLogoFile(e.dataTransfer.files[0], side);
      }
    });

    input.addEventListener('change', () => {
      if (input.files.length) {
        handleLogoFile(input.files[0], side);
      }
    });

    // Remove button
    const removeBtn = preview.querySelector('.btn-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        preview.style.display = 'none';
        zone.style.display = '';
        if (onPhotosChange) onPhotosChange(`logo_${side}`, '');
      });
    }
  });
}

async function handleLogoFile(file, side) {
  const zone = document.getElementById(`logo-${side}-zone`);
  const preview = document.getElementById(`logo-${side}-preview`);
  const img = preview.querySelector('img');

  try {
    zone.style.display = 'none';
    preview.style.display = 'block';

    const localUrl = URL.createObjectURL(file);
    img.src = localUrl;

    const { url } = await api.uploadLogo(file);
    img.src = url;
    if (onPhotosChange) onPhotosChange(`logo_${side}`, url);
  } catch (err) {
    zone.style.display = '';
    preview.style.display = 'none';
    showToast(err.message, 'error');
  }
}

// === Photos Upload ===
function setupPhotosUpload() {
  const zone = document.getElementById('photos-upload-zone');
  const input = document.getElementById('photos-upload');

  if (!zone) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handlePhotoFiles(e.dataTransfer.files);
    }
  });

  input.addEventListener('change', () => {
    if (input.files.length) {
      handlePhotoFiles(input.files);
      input.value = '';
    }
  });
}

async function handlePhotoFiles(fileList) {
  const remaining = 10 - photos.length;
  if (remaining <= 0) {
    showToast('รูปภาพเต็มแล้ว (สูงสุด 10 รูป)', 'error');
    return;
  }

  const files = Array.from(fileList).slice(0, remaining);

  try {
    const { urls } = await api.uploadPhoto(files);
    photos.push(...urls);
    renderPhotosList();
    updatePhotoCount();
    if (onPhotosChange) onPhotosChange('photos', photos);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderPhotosList() {
  const list = document.getElementById('photos-list');
  if (!list) return;

  list.innerHTML = '';
  photos.forEach((url, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    thumb.draggable = true;
    thumb.dataset.index = index;
    thumb.innerHTML = `
      <img src="${url}" alt="รูปที่ ${index + 1}" />
      <span class="photo-order">${index + 1}</span>
      <button class="btn-remove" data-index="${index}" title="ลบรูป">✕</button>
    `;

    // Remove button
    thumb.querySelector('.btn-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      photos.splice(index, 1);
      renderPhotosList();
      updatePhotoCount();
      if (onPhotosChange) onPhotosChange('photos', photos);
    });

    // Drag & Drop reorder
    thumb.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      thumb.classList.add('dragging');
    });
    thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
    thumb.addEventListener('dragover', (e) => {
      e.preventDefault();
      thumb.style.opacity = '0.7';
    });
    thumb.addEventListener('dragleave', () => {
      thumb.style.opacity = '1';
    });
    thumb.addEventListener('drop', (e) => {
      e.preventDefault();
      thumb.style.opacity = '1';
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toIndex = index;
      if (fromIndex !== toIndex) {
        const [moved] = photos.splice(fromIndex, 1);
        photos.splice(toIndex, 0, moved);
        renderPhotosList();
        if (onPhotosChange) onPhotosChange('photos', photos);
      }
    });

    list.appendChild(thumb);
  });

  updatePhotoCount();
}

function updatePhotoCount() {
  const countEl = document.getElementById('photo-count');
  if (countEl) {
    countEl.textContent = `${photos.length}/10`;
  }
}

// Load existing data into UI
export function loadImageData(data) {
  if (!data) return;

  // Load background
  if (data.background_url) {
    const bgPreviewWrap = document.getElementById('bg-preview-wrap');
    const bgPreviewImg = document.getElementById('bg-preview-img');
    const bgZone = document.getElementById('bg-upload-zone');
    const bgSpacing = document.getElementById('bg-spacing-control');
    const page = document.getElementById('nl-page');

    if (bgPreviewWrap && bgPreviewImg && bgZone) {
      bgPreviewImg.src = data.background_url;
      bgPreviewWrap.style.display = 'block';
      bgZone.style.display = 'none';
      if (bgSpacing) bgSpacing.style.display = 'flex';
      
      // Apply saved spacings
      if (page) {
        if (data.bg_top_spacing) {
          page.style.setProperty('--bg-top-spacing', data.bg_top_spacing);
          const topSlider = document.getElementById('bg-top-spacing');
          const topVal = document.getElementById('bg-spacing-value');
          if (topSlider) topSlider.value = parseInt(data.bg_top_spacing);
          if (topVal) topVal.textContent = data.bg_top_spacing;
        }
        if (data.bg_bottom_spacing) {
          page.style.setProperty('--bg-bottom-spacing', data.bg_bottom_spacing);
          const botSlider = document.getElementById('bg-bottom-spacing');
          const botVal = document.getElementById('bg-bottom-spacing-value');
          if (botSlider) botSlider.value = parseInt(data.bg_bottom_spacing);
          if (botVal) botVal.textContent = data.bg_bottom_spacing;
        }
      }
    }
  }

  // Logos
  ['left', 'right'].forEach(side => {
    const url = data[`logo_${side}_url`];
    if (url) {
      const zone = document.getElementById(`logo-${side}-zone`);
      const preview = document.getElementById(`logo-${side}-preview`);
      const img = preview?.querySelector('img');
      if (zone && preview && img) {
        zone.style.display = 'none';
        preview.style.display = 'block';
        img.src = url;
      }
    }
  });

  // Photos
  if (data.photos && data.photos.length) {
    photos = [...data.photos];
    renderPhotosList();
  }
}

// Toast helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
