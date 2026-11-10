// The colours the app gives the plugin. When the app is older, the plugin uses its own light and dark values.
export type Palette = { page: string; card: string; text: string; textSecondary: string; separator: string; fill: string; tint: string; onTint: string; tintSoft: string; good: string; goodSoft: string };

const LIGHT: Palette = { page: '#F2F2F7', card: '#FFFFFF', text: '#000000', textSecondary: '#636368', separator: '#D8D8DC', fill: '#E5E5EA', tint: '#0A6CC9', onTint: '#FFFFFF', tintSoft: '#EBF4FD', good: '#1E7A34', goodSoft: '#DDF3E2' };
const DARK: Palette = { page: '#000000', card: '#1C1C1E', text: '#FFFFFF', textSecondary: '#AEAEB2', separator: '#48484A', fill: '#3A3A3C', tint: '#4DB3FF', onTint: '#000000', tintSoft: '#0B2236', good: '#30D158', goodSoft: '#123620' };

export const paletteFrom = (prefs: any): Palette => {
  const colours = prefs?.colours;
  if (colours?.current) return colours.current as Palette;
  return prefs?.theme === 'dark' ? DARK : LIGHT;
};

// Liquid Glass (D-glass): the same values as the app's --glass-liquid-* and --glass-blur tokens in main.css.
// They are not part of the app's colour palette, so the plugin picks them by the theme the app sends.
export type Glass = { fill: string; edge: string; blur: string; shadow: string };
const GLASS_LIGHT: Glass = { fill: 'rgba(255,255,255,0.5)', edge: 'rgba(255,255,255,0.7)', blur: 'blur(16px) saturate(180%)', shadow: '0 8px 24px rgba(0,0,0,0.12)' };
const GLASS_DARK: Glass = { fill: 'rgba(40,40,44,0.45)', edge: 'rgba(255,255,255,0.22)', blur: 'blur(16px) saturate(180%)', shadow: '0 8px 24px rgba(0,0,0,0.5)' };

export const glassFrom = (prefs: any): Glass => (prefs?.theme === 'dark' ? GLASS_DARK : GLASS_LIGHT);
