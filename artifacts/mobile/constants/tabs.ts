import { Href } from "expo-router";
import { Feather } from "@expo/vector-icons";

export type TabKey = "index" | "learn" | "coach" | "family" | "profile";

export interface TabDef {
  key: TabKey;
  label: string;
  featherIcon: keyof typeof Feather.glyphMap;
  sfSymbol: string;
  sfSymbolSelected: string;
  href: Href;
}

export const TABS: TabDef[] = [
  { key: "index", label: "Home", featherIcon: "home", sfSymbol: "house", sfSymbolSelected: "house.fill", href: "/(tabs)" },
  { key: "learn", label: "Learn", featherIcon: "book-open", sfSymbol: "book", sfSymbolSelected: "book.fill", href: "/(tabs)/learn" },
  {
    key: "coach",
    label: "Coach",
    featherIcon: "message-circle",
    sfSymbol: "bubble.left.and.bubble.right",
    sfSymbolSelected: "bubble.left.and.bubble.right.fill",
    href: "/(tabs)/coach",
  },
  { key: "family", label: "Family", featherIcon: "users", sfSymbol: "person.2", sfSymbolSelected: "person.2.fill", href: "/(tabs)/family" },
  {
    key: "profile",
    label: "Profile",
    featherIcon: "user",
    sfSymbol: "person.crop.circle",
    sfSymbolSelected: "person.crop.circle.fill",
    href: "/(tabs)/profile",
  },
];

export default TABS;
