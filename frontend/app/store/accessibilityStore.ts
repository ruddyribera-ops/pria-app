/**
 * Zustand store for accessibility state
 * Manages profile selection, settings, and persistence to localStorage
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AccessibilityProfile,
  AccessibilitySettings,
  AccessibilityState,
} from "@/app/lib/types/accessibility";

const initialSettings: AccessibilitySettings = {
  profile: "default",
  color_scheme: "light",
  reduced_motion: false,
  preferred_language: "es",
};

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set, get) =>
      ({
        profile: "default" as AccessibilityProfile,
        settings: initialSettings,
        setProfile: (profile: AccessibilityProfile) => {
          set((state) => ({
            profile,
            settings: { ...state.settings, profile },
          }));
        },
        toggleReducedMotion: () => {
          const state = get();
          const newSettings = {
            ...state.settings,
            reduced_motion: !state.settings.reduced_motion,
          };
          set({ settings: newSettings });
        },
        setFontSize: (size: number) => {
          if (size < 10 || size > 20) {
            console.warn("Font size must be between 10 and 20");
            return;
          }
          const state = get();
          const newSettings = {
            ...state.settings,
            font_size_override: size,
          };
          set({ settings: newSettings });
        },
        setSetting: (key: string, value: unknown) => {
          const state = get();
          const newSettings = {
            ...state.settings,
            [key]: value,
          };
          set({ settings: newSettings });
        },
      }) as AccessibilityState,
    {
      name: "accessibility-store",
    }
  )
);
