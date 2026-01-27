/**
 * Design tokens for consistent styling across all demos.
 * Single source of truth for colors, spacing, and other design values.
 */

/** Primary accent color used across all demos */
export const colors = {
  accent: "blue-600",
  accentHover: "blue-700",
  accentLight: "blue-50",
  accentLightDark: "blue-900/20",

  error: "red-600",
  errorLight: "red-50",
  errorLightDark: "red-900/20",
  errorBorder: "red-200",
  errorBorderDark: "red-800",

  success: "green-600",
  successLight: "green-50",
  successLightDark: "green-900/20",
  successBorder: "green-200",
  successBorderDark: "green-800",

  warning: "yellow-600",
  warningLight: "yellow-50",
  warningLightDark: "yellow-900/20",
  warningBorder: "yellow-200",
  warningBorderDark: "yellow-800",

  info: "blue-500",
  infoLight: "blue-50",
  infoLightDark: "blue-900/20",
  infoBorder: "blue-200",
  infoBorderDark: "blue-800",

  neutral: {
    50: "neutral-50",
    100: "neutral-100",
    200: "neutral-200",
    300: "neutral-300",
    400: "neutral-400",
    500: "neutral-500",
    600: "neutral-600",
    700: "neutral-700",
    800: "neutral-800",
    900: "neutral-900",
  },
} as const;

/** Consistent spacing values */
export const spacing = {
  buttonPadding: "px-4 py-2",
  buttonPaddingSmall: "px-3 py-1.5",
  buttonPaddingLarge: "px-6 py-3",
  inputPadding: "px-3 py-2",
  cardPadding: "p-4",
  cardPaddingLarge: "p-6",
  sectionGap: "gap-4",
  itemGap: "gap-2",
} as const;

/** Border radius values */
export const radius = {
  default: "rounded-lg",
  small: "rounded",
  full: "rounded-full",
} as const;

/** Focus ring styles for accessibility */
export const focus = {
  ring: "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  ringNoOffset: "focus:outline-none focus:ring-2 focus:ring-blue-500",
  visible: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
} as const;

/** Transition presets */
export const transitions = {
  default: "transition-colors duration-200",
  all: "transition-all duration-200",
  fast: "transition-colors duration-100",
} as const;
