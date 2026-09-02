import { Platform } from 'react-native';

/**
 * PropertyFlow mobile tokens — same ivory + evergreen system as the web app
 * (`apps/web/src/app/globals.css`).
 */

/** Real phone UI font. Do not use the name "System" — iOS ignores it and keeps the old face. */
export const fontFamily = Platform.OS === 'android' ? 'sans-serif' : undefined;

export type ThemeMode = 'light' | 'dark';

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  primary: string;
  primaryText: string;
  accent: string;
  accentMuted: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  tabBar: string;
  input: string;
  chip: string;
  bubbleMine: string;
  bubbleOther: string;
  overlay: string;
}

export const lightColors: ColorTokens = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F1EA',
  surfaceElevated: '#FFFFFF',
  primary: '#2B5F48',
  primaryText: '#FBF8F0',
  accent: '#2B5F48',
  accentMuted: '#E4EDE6',
  text: '#14201B',
  textMuted: '#3F4F48',
  textSubtle: '#5C6B64',
  border: '#E8E2D6',
  borderStrong: '#D0C6B4',
  success: '#2B5F48',
  warning: '#C47A12',
  danger: '#B42318',
  info: '#2B5C8A',
  tabBar: '#FFFFFF',
  input: '#FFFFFF',
  chip: '#F4F1EA',
  bubbleMine: '#2B5F48',
  bubbleOther: '#F4F1EA',
  overlay: 'rgba(20, 32, 27, 0.45)',
};

export const darkColors: ColorTokens = {
  background: '#000000',
  surface: '#111111',
  surfaceMuted: '#1A1A1A',
  surfaceElevated: '#161616',
  primary: '#3D9B7A',
  primaryText: '#04110C',
  accent: '#3D9B7A',
  accentMuted: '#0C1F18',
  text: '#F5F5F5',
  textMuted: '#A3A3A3',
  textSubtle: '#737373',
  border: '#222222',
  borderStrong: '#2E2E2E',
  success: '#3D9B7A',
  warning: '#FFFFFF',
  danger: '#E05A4F',
  info: '#6BA3D6',
  tabBar: '#000000',
  input: '#111111',
  chip: '#1A1A1A',
  bubbleMine: '#3D9B7A',
  bubbleOther: '#1A1A1A',
  overlay: 'rgba(0, 0, 0, 0.72)',
};

/** @deprecated Prefer useTheme().colors — kept for rare static fallbacks. */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  h1: { fontFamily, fontSize: 32, fontWeight: '600' as const, letterSpacing: 0 },
  h2: { fontFamily, fontSize: 22, fontWeight: '600' as const, letterSpacing: 0 },
  title: { fontFamily, fontSize: 18, fontWeight: '600' as const, letterSpacing: 0 },
  body: { fontFamily, fontSize: 17, fontWeight: '400' as const, letterSpacing: 0 },
  label: { fontFamily, fontSize: 15, fontWeight: '600' as const, letterSpacing: 0 },
  caption: { fontFamily, fontSize: 15, fontWeight: '400' as const, letterSpacing: 0 },
} as const;

/** Elevation presets. Dark mode drops shadows (they read as grey haze). */
export const shadows = {
  none: {},
  soft: {
    shadowColor: '#1D2A25',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#1D2A25',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export function colorsFor(mode: ThemeMode): ColorTokens {
  return mode === 'dark' ? darkColors : lightColors;
}

export const theme = { colors: lightColors, spacing, radius, typography } as const;
export type Theme = typeof theme;
