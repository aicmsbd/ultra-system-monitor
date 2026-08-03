import { Settings } from '../../shared/types';

/** Applies theme + optional custom accent color to the document root. */
export function applyTheme(s: Settings): void {
  document.documentElement.dataset.theme = s.theme;
  const root = document.documentElement.style;
  if (s.accentColor && /^#[0-9a-f]{6}$/i.test(s.accentColor)) {
    root.setProperty('--accent', s.accentColor);
  } else {
    root.removeProperty('--accent');
  }
}
