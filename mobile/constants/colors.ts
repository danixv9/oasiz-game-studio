export const Colors = {
  // Core backgrounds
  background: '#0B0B1E',
  backgroundLight: '#12122A',
  surface: '#1A1A36',
  surfaceLight: '#242450',

  // Primary palette
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  purpleDark: '#6D28D9',

  // Accent colors
  cyan: '#06B6D4',
  cyanLight: '#22D3EE',
  pink: '#EC4899',
  pinkLight: '#F472B6',
  orange: '#F97316',
  green: '#10B981',
  greenLight: '#34D399',
  red: '#EF4444',
  yellow: '#FBBF24',
  indigo: '#6366F1',
  rose: '#F43F5E',
  teal: '#14B8A6',
  sky: '#38BDF8',
  amber: '#F59E0B',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1C7',
  textMuted: '#6B6B8D',

  // Glass effects
  glass: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHeavy: 'rgba(255, 255, 255, 0.12)',

  // Shadows
  shadowPurple: 'rgba(139, 92, 246, 0.3)',
  shadowCyan: 'rgba(6, 182, 212, 0.3)',
  shadowPink: 'rgba(236, 72, 153, 0.3)',
};

export const Gradients = {
  primary: ['#8B5CF6', '#EC4899'] as const,
  secondary: ['#06B6D4', '#8B5CF6'] as const,
  accent: ['#F97316', '#EC4899'] as const,
  success: ['#10B981', '#06B6D4'] as const,
  fire: ['#EF4444', '#F97316'] as const,
  ocean: ['#0EA5E9', '#6366F1'] as const,
  sunset: ['#F97316', '#F43F5E'] as const,
  aurora: ['#06B6D4', '#10B981'] as const,
  night: ['#6366F1', '#8B5CF6'] as const,
};

export type GradientName = keyof typeof Gradients;
