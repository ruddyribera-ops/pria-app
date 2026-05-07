/**
 * Accessibility profile types for PRIA v7 Phase 4
 * Neuroinclusive themes for 4 profiles: Dislexia, ADHD, TEA, Dyscalculia
 */

export type AccessibilityProfile =
  | "default"
  | "dislexia"
  | "adhd"
  | "tea"
  | "dyscalculia";

export interface AccessibilitySettings {
  profile: AccessibilityProfile;
  font_size_override?: number; // 10-20pt
  color_scheme: "light" | "dark" | "custom";
  reduced_motion: boolean;
  preferred_language: string;
}

export interface ProfileMetadata {
  name: string;
  description: string;
  fonts: string[];
  colors: string[];
  spacing: {
    line_height: number;
    letter_spacing: string;
    padding: string;
    margin: string;
  };
  contrast_ratio: number;
  specific_settings: Record<string, unknown>;
}

export interface AccessibilityState {
  profile: AccessibilityProfile;
  settings: AccessibilitySettings;
  loading: boolean;
  error: string | null;
  setProfile: (profile: AccessibilityProfile) => Promise<void>;
  toggleReducedMotion: () => void;
  setFontSize: (size: number) => void;
  setSetting: (key: string, value: unknown) => void;
}
