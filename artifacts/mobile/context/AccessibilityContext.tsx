import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

export type FontScale = 1 | 1.15 | 1.3 | 1.5;
export type ThemeMode = "system" | "light" | "dark";

export interface AccessibilitySettings {
  themeMode: ThemeMode;
  highContrast: boolean;
  fontScale: FontScale;
  reduceMotion: boolean;
  reduceHaptics: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  isLoading: boolean;
  setThemeMode: (value: ThemeMode) => Promise<void>;
  setHighContrast: (value: boolean) => Promise<void>;
  setFontScale: (value: FontScale) => Promise<void>;
  setReduceMotion: (value: boolean) => Promise<void>;
  setReduceHaptics: (value: boolean) => Promise<void>;
}

const STORAGE_KEY = "@dv_accessibility";

const defaultSettings: AccessibilitySettings = {
  themeMode: "system",
  highContrast: false,
  fontScale: 1,
  reduceMotion: false,
  reduceHaptics: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        setSettings({ ...defaultSettings, ...stored });
      } else {
        const osReduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
        setSettings({ ...defaultSettings, reduceMotion: osReduceMotion });
      }
    } catch {
      // ignore, fall back to defaults
    } finally {
      setIsLoading(false);
    }
  };

  const persist = (next: AccessibilitySettings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const setThemeMode = async (value: ThemeMode) => persist({ ...settings, themeMode: value });
  const setHighContrast = async (value: boolean) => persist({ ...settings, highContrast: value });
  const setFontScale = async (value: FontScale) => persist({ ...settings, fontScale: value });
  const setReduceMotion = async (value: boolean) => persist({ ...settings, reduceMotion: value });
  const setReduceHaptics = async (value: boolean) => persist({ ...settings, reduceHaptics: value });

  return (
    <AccessibilityContext.Provider
      value={{ settings, isLoading, setThemeMode, setHighContrast, setFontScale, setReduceMotion, setReduceHaptics }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within an AccessibilityProvider");
  return ctx;
}
