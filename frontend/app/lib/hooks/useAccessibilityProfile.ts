/**
 * Custom React hook for managing accessibility profile
 * Handles loading from API, saving to localStorage, and injecting CSS themes
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { AccessibilityProfile, AccessibilitySettings } from "@/app/lib/types/accessibility";
import { useAccessibilityStore } from "@/app/store/accessibilityStore";

export function useAccessibilityProfile() {
  const store = useAccessibilityStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user profile on mount
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR guard

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from API first
        const response = await fetch("/api/accessibility/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          store.setProfile(data.profile);
          // Save to localStorage for persistence
          localStorage.setItem("accessibility_profile", JSON.stringify(data));
        } else {
          // Fall back to localStorage if API fails
          const cached = localStorage.getItem("accessibility_profile");
          if (cached) {
            const data = JSON.parse(cached);
            store.setProfile(data.profile);
          }
        }
      } catch (err) {
        console.error("Failed to load accessibility profile:", err);
        // Graceful degradation: try localStorage
        const cached = localStorage.getItem("accessibility_profile");
        if (cached) {
          try {
            const data = JSON.parse(cached);
            store.setProfile(data.profile);
          } catch {
            // If both fail, use default
            setError("Could not load accessibility settings");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [store]);

  // Apply CSS theme when profile changes
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR guard

    const applyTheme = (profile: AccessibilityProfile) => {
      // Remove all existing theme classes
      document.body.className = document.body.className
        .split(" ")
        .filter((cls) => !cls.startsWith("theme-"))
        .join(" ");

      // Add new theme class
      if (profile !== "default") {
        document.body.classList.add(`theme-${profile}`);
      }

      // Inject/update theme CSS link
      let themeLink = document.getElementById("theme-stylesheet") as HTMLLinkElement | null;
      if (!themeLink) {
        themeLink = document.createElement("link");
        themeLink.id = "theme-stylesheet";
        themeLink.rel = "stylesheet";
        document.head.appendChild(themeLink);
      }

      if (profile !== "default") {
        themeLink.href = `/themes/${profile}.css`;
      } else {
        themeLink.href = "";
      }
    };

    applyTheme(store.profile);
  }, [store.profile]);

  const setProfile = useCallback(
    async (profile: AccessibilityProfile) => {
      try {
        setLoading(true);
        setError(null);

        // Update store (triggers CSS injection via useEffect)
        store.setProfile(profile);

        // POST to backend
        const response = await fetch("/api/accessibility/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save profile: ${response.statusText}`);
        }

        // Save to localStorage for persistence
        const settings: AccessibilitySettings = {
          profile,
          color_scheme: "light",
          reduced_motion: false,
          preferred_language: "es",
        };
        localStorage.setItem("accessibility_profile", JSON.stringify(settings));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Failed to set accessibility profile:", err);
      } finally {
        setLoading(false);
      }
    },
    [store]
  );

  return {
    profile: store.profile,
    settings: store.settings,
    setProfile,
    loading,
    error,
  };
}
