
export const lightTheme = {
  background: '#f8fafc', // slate-50
  foreground: '#0f172a', // slate-900
  card: '#ffffff',
  cardForeground: '#0f172a',
  secondaryCard: '#f1f5f9',
  border: '#f1f5f9',     // slate-100
  muted: '#64748b',      // slate-500
  mutedForeground: '#94a3b8', // slate-400
  accent: '#2563eb',     // blue-600
  accentForeground: '#ffffff',
  success: '#22c55e',    // green-500
  warning: '#f59e0b',    // amber-500
  error: '#ef4444',      // red-500
  primary: '#16a34a',    // green-600
};

export const darkTheme = {
  background: '#0f1115',
  foreground: '#ffffff',
  card: '#1a1f29',
  cardForeground: '#ffffff',
  secondaryCard: '#232937',
  border: '#2f3747',
  muted: '#b8c0cc',
  mutedForeground: '#8892a6',
  accent: '#4f8cff',
  accentForeground: '#ffffff',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  primary: '#4f8cff',
};

export type ThemeColors = typeof lightTheme;
