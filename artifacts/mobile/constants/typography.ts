export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const typeScale = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: fontFamily.bold },
  h1: { fontSize: 26, lineHeight: 32, fontFamily: fontFamily.bold },
  h2: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.semibold },
  h3: { fontSize: 17, lineHeight: 23, fontFamily: fontFamily.semibold },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.regular },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.medium },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular },
  label: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.medium },
  small: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.medium },
} as const;

export default typeScale;
