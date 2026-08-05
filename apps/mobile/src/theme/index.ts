/**
 * PropertyFlow mobile design tokens.
 *
 * Mirrors the web app's "cream + deep navy" direction so the two clients feel
 * like one product. Kept as plain objects (no styling library) to stay light.
 */

export const colors = {
  // Surfaces
  background: '#F6F1E7', // warm cream
  surface: '#FFFFFF',
  surfaceMuted: '#F0EADC',
  // Brand
  primary: '#12233B', // deep navy
  primaryText: '#FFFFFF',
  accent: '#1F6F5C', // muted green (from the previous cream+green scheme)
  // Text
  text: '#12233B',
  textMuted: '#5E6A78',
  textSubtle: '#8A94A0',
  // Lines
  border: '#E4DBC9',
  borderStrong: '#D6CBB3',
  // Status
  success: '#1F6F5C',
  warning: '#B7791F',
  danger: '#B4402F',
  info: '#2B5C8A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2 },
  title: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
} as const;

export const theme = { colors, spacing, radius, typography } as const;
export type Theme = typeof theme;
