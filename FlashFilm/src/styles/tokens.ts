export const Colors = {
  bgPage: '#000000',
  bgSurface: '#0f0f0f',
  bgElevated: '#1b1b1b',
  bgInteractive: '#1f1f1f',
  bgSelected: '#2a2a2a',
  borderSubtle: '#222222',
  borderDefault: '#3a3a3a',
  textPrimary: '#f0f0f0',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  textInverse: '#111111',
  surfaceAction: '#f0f0f0',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const Sizes = {
  tapTargetLarge: 48,
  tapTargetMedium: 40,
  tapTargetSmall: 32,
  iconButtonM: 40,
} as const;

export const Radius = { sm: 4, md: 8, lg: 12, full: 999 } as const;
export const Motion = { fast: 150, normal: 200, slow: 300 } as const;
