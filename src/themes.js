/**
 * Themes - Gestión de temas claro/oscuro
 */

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('editor-theme', theme);
}

export function toggleTheme() {
  const current = getTheme();
  const newTheme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

export function loadSavedTheme() {
  const saved = localStorage.getItem('editor-theme');
  if (saved) {
    setTheme(saved);
    return saved;
  }
  
  // Detectar preferencia del sistema
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = prefersDark ? 'dark' : 'light';
  setTheme(theme);
  return theme;
}
