import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Body, H2 } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="compass" size={32} color={colors.primary} />
        </View>
        <H2 style={styles.title}>This screen doesn&apos;t exist.</H2>
        <Link href="/" style={styles.link}>
          <Body color={colors.primary}>Go to home screen!</Body>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  iconWrap: { width: 72, height: 72, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  title: { textAlign: "center" },
  link: { marginTop: spacing.sm, paddingVertical: spacing.md },
});
