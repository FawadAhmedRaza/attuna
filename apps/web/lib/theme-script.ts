// Inline script run before paint to set [data-theme] before React hydrates.
// Prevents FOUC and matches DESIGN_SYSTEM.md: persist in localStorage,
// honor prefers-color-scheme on first visit.
export const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;
