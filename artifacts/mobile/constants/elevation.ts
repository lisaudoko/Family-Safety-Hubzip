// Warm brown-black shadow tint (not pure #000) so shadows read warm in both light and dark mode.
const SHADOW_COLOR = "#451A03";

export const shadow = {
  sm: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export default shadow;
