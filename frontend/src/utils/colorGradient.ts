export interface ColorGradientOptions {
  lightColor: string; // e.g., "#86efac" (green-300)
  darkColor: string; // e.g., "#15803d" (green-700)
  excludeLabel?: string; // Label to exclude from gradient (e.g., "Unknown")
  unknownColor?: string; // Color for excluded label
}

// Parses a hex color string to RGB values
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

// Converts RGB values to a hex color string
function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
}

// Linear interpolation between two RGB values
function lerpRgb(
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: rgb1.r + (rgb2.r - rgb1.r) * t,
    g: rgb1.g + (rgb2.g - rgb1.g) * t,
    b: rgb1.b + (rgb2.b - rgb1.b) * t,
  };
}

/**
 * Generates a color gradient between light and dark colors.
 * Returns a mapping of labels to colors.
 *
 * @param count - Number of colors to generate (excluding the excluded label)
 * @param options - Gradient options
 * @returns Object mapping labels to hex color strings
 */
export function generateColorGradient(
  labels: string[],
  options: ColorGradientOptions,
): Record<string, string> {
  const {
    lightColor,
    darkColor,
    excludeLabel = "Unknown",
    unknownColor = "#6b7280",
  } = options;

  const excludedLabel = labels.find((label) => label === excludeLabel);
  const otherLabels = labels.filter((label) => label !== excludeLabel);

  const colorMap: Record<string, string> = {};

  if (excludedLabel) {
    colorMap[excludedLabel] = unknownColor;
  }

  // If no other labels, return just the excluded color
  if (otherLabels.length === 0) {
    return colorMap;
  }

  // Parse colors to RGB
  const lightRgb = hexToRgb(lightColor);
  const darkRgb = hexToRgb(darkColor);

  // Generate gradient colors
  otherLabels.forEach((label, index) => {
    const t = otherLabels.length > 1 ? index / (otherLabels.length - 1) : 0.5;

    const interpolatedRgb = lerpRgb(lightRgb, darkRgb, t);

    // Convert back to hex
    colorMap[label] = rgbToHex(
      interpolatedRgb.r,
      interpolatedRgb.g,
      interpolatedRgb.b,
    );
  });

  return colorMap;
}
