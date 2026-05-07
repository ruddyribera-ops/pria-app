/**
 * Client-side layout wrapper
 * Integrates accessibility profiles, theme providers, and ProfileSwitcher
 */

"use client";

import { useEffect } from "react";
import { ProfileSwitcher } from "@/app/components/accessibility/ProfileSwitcher";
import { DislexiaTheme } from "@/app/components/accessibility/DislexiaTheme";
import { ADHDTheme } from "@/app/components/accessibility/ADHDTheme";
import { TEATheme } from "@/app/components/accessibility/TEATheme";
import { DyscalculiaTheme } from "@/app/components/accessibility/DyscalculiaTheme";
import { useAccessibilityProfile } from "@/app/lib/hooks/useAccessibilityProfile";

export function RootLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = useAccessibilityProfile();

  // Load user profile on app startup
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check localStorage for saved preference
    const saved = localStorage.getItem("accessibility_profile");
    if (!saved) {
      // Default to system preference or saved profile if available
      const systemPreference = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (systemPreference) {
        console.log("System preference: reduced motion detected");
      }
    }
  }, []);

  return (
    <>
      {/* Theme injectors - these are zero-render components that inject CSS */}
      <DislexiaTheme />
      <ADHDTheme />
      <TEATheme />
      <DyscalculiaTheme />

      {/* Profile switcher - always visible in top-right */}
      <ProfileSwitcher />

      {/* Main content */}
      {children}
    </>
  );
}
