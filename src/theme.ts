// Material Design 3 Color Tokens
// Sourced from standard baseline scheme

export const MD3LightTheme = {
  primary: "#6750A4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#EADDFF",
  onPrimaryContainer: "#21005D",

  secondary: "#625B71",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E8DEF8",
  onSecondaryContainer: "#1D192B",

  tertiary: "#7D5260",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FFD8E4",
  onTertiaryContainer: "#31111D",

  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",

  background: "#FEF7FF",
  onBackground: "#1D1B20",

  surface: "#FEF7FF",
  onSurface: "#1D1B20",
  surfaceVariant: "#E7E0EC",
  onSurfaceVariant: "#49454F",
  outline: "#79747E",

  surfaceContainerLow: "#F7F2FA",
  surfaceContainer: "#F3EDF7",
  surfaceContainerHigh: "#ECE6F0",
  surfaceContainerHighest: "#E6E0E9",

  inverseSurface: "#313033",
  inverseOnSurface: "#F4EFF4",
  inversePrimary: "#D0BCFF",

  // Custom Buffer Tokens
  bufferContainer: "#FFF8E1", // Amber 50
  bufferContainerSelected: "#FFECB3", // Amber 100
  bufferBorder: "#FFC107", // Amber 500
  onBuffer: "#4E342E", // Amber 900
  onBufferVariant: "#8D6E63", // Brown 400
};

export const MD3DarkTheme = {
  primary: "#D0BCFF",
  onPrimary: "#381E72",
  primaryContainer: "#4F378B",
  onPrimaryContainer: "#EADDFF",

  secondary: "#CCC2DC",
  onSecondary: "#332D41",
  secondaryContainer: "#4A4458",
  onSecondaryContainer: "#E8DEF8",

  tertiary: "#EFB8C8",
  onTertiary: "#492532",
  tertiaryContainer: "#633B48",
  onTertiaryContainer: "#FFD8E4",

  error: "#F2B8B5",
  onError: "#601410",
  errorContainer: "#8C1D18",
  onErrorContainer: "#F9DEDC",

  background: "#141218",
  onBackground: "#E6E1E5",

  surface: "#141218",
  onSurface: "#E6E1E5",
  surfaceVariant: "#49454F",
  onSurfaceVariant: "#CAC4D0",
  outline: "#938F99",

  surfaceContainerLow: "#1D1B20",
  surfaceContainer: "#211F26",
  surfaceContainerHigh: "#2B2930",
  surfaceContainerHighest: "#36343B",

  inverseSurface: "#E6E1E5",
  inverseOnSurface: "#313033",
  inversePrimary: "#6750A4",

  // Custom Buffer Tokens
  bufferContainer: "#4E342E", // Dark Amber
  bufferContainerSelected: "#6D4C41", // Darker Amber
  bufferBorder: "#FFC107", // Amber 500
  onBuffer: "#FFF8E1", // Light Amber Text
  onBufferVariant: "#D7CCC8", // Light Brown
};

export type MD3Theme = typeof MD3LightTheme;

export const Fonts = {
  regular: "System", // Use system font for now, or Roboto if loaded
  medium: "System",
  bold: "System",
};
