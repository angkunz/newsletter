// Templates — Template definitions and switching logic

export const templates = {
  classic: {
    id: 'classic',
    name: '🌸 คลาสสิก',
    colors: {
      primary: '#E91E8C',
      secondary: '#F48FB1',
      gradient: 'linear-gradient(135deg, #E91E8C, #F48FB1)',
    },
  },
  modern: {
    id: 'modern',
    name: '🌊 ทันสมัย',
    colors: {
      primary: '#1565C0',
      secondary: '#42A5F5',
      gradient: 'linear-gradient(135deg, #1565C0, #42A5F5)',
    },
  },
  nature: {
    id: 'nature',
    name: '🌿 ธรรมชาติ',
    colors: {
      primary: '#2E7D32',
      secondary: '#66BB6A',
      gradient: 'linear-gradient(135deg, #2E7D32, #66BB6A)',
    },
  },
  warm: {
    id: 'warm',
    name: '🌅 อบอุ่น',
    colors: {
      primary: '#E65100',
      secondary: '#FFB74D',
      gradient: 'linear-gradient(135deg, #E65100, #FFB74D)',
    },
  },
};

export function applyTemplate(templateId) {
  const page = document.getElementById('nl-page');
  if (!page) return;
  page.setAttribute('data-template', templateId);

  // Update template card active state
  document.querySelectorAll('.template-card').forEach(card => {
    card.classList.toggle('active', card.dataset.template === templateId);
  });
}

export function getTemplateColor(templateId) {
  return templates[templateId] || templates.classic;
}
