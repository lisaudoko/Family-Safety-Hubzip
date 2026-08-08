// Per-child identity colors, deliberately independent of the light/dark/high-contrast
// theme palette in constants/colors.ts: a child's avatar/age-band color must stay
// visually stable across theme changes so kids and parents keep recognizing "their" color.

export const AGE_BAND_COLORS: Record<string, string> = {
  "6-9": "#4CAF7D",
  "10-13": "#4A90A4",
  "14-17": "#7B5EA7",
};

export const AVATAR_COLORS = ["#3A7D6B", "#4A90A4", "#E07B39", "#8E44AD", "#E91E8C", "#F39C12"];

export function avatarColorForName(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}
