export const themes = {
  elektrochemie: {dark:'#163e50', accent:'#176b8b', light:'#edf5fa'},
  stofftransport: {dark:'#193e35', accent:'#24745d', light:'#edf5ee'},
  beschichtungen: {dark:'#4a3455', accent:'#77508c', light:'#f4eff7'},
  werkstofftechnik: {dark:'#513821', accent:'#8b5e2f', light:'#f8f1e8'}
};
export function activityIcon(activity) {
  const paths = {
    simulation:'<path d="M8 4l12 8-12 8z"/>',
    datenauswertung:'<path d="M4 3v17h17M7 15l4-6 4 3 5-7"/><circle cx="11" cy="9" r="1"/>',
    bildanalyse:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="2"/><path d="M4 18l6-5 4 3 4-6 3 4"/>'
  };
  return `<svg class="wd-icon" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">${paths[activity] || paths.datenauswertung}</svg>`;
}
