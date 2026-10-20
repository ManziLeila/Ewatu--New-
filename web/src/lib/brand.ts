/** E-Watu brand palette — keep in sync with styles/brand.css */
export const BRAND = {
  primary: '#00466c',
  primaryLight: '#d9ecf4',
  primaryMid: '#005580',
  primaryDark: '#003352',
  primaryDarker: '#002233',
  secondary: '#f5911e',
  secondaryLight: '#fdebd0',
  secondaryDark: '#c97412',
  onPrimary: '#f8fafc',
  onSecondary: '#002233',
} as const;

/** Chart / KPI fills (Recharts, inline SVG) — use instead of raw hex in TSX */
export const CHART = {
  primary: BRAND.primary,
  secondary: BRAND.secondary,
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0284c7',
} as const;

/** CSS variable references for inline styles in components */
export const CSS_VAR = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  primaryLight: 'var(--color-primary-light)',
  secondarySoft: 'var(--color-secondary-soft)',
  textOnLight: 'var(--color-text-on-light)',
  textMuted: 'var(--color-text-muted-on-light)',
} as const;
