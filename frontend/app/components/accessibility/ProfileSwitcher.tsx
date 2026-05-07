/**
 * ProfileSwitcher Component
 * Dropdown for selecting accessibility profile
 * Position: Top-right corner, always visible
 */

"use client";

import { useState } from "react";
import { useAccessibilityProfile } from "@/app/lib/hooks/useAccessibilityProfile";
import { AccessibilityProfile } from "@/app/lib/types/accessibility";
import styles from "./ProfileSwitcher.module.css";

const PROFILES: { value: AccessibilityProfile; label: string; description: string }[] = [
  {
    value: "default",
    label: "Estándar",
    description: "Interfaz estándar",
  },
  {
    value: "dislexia",
    label: "Dislexia",
    description: "Fuente Dyslexie, espaciado amplio",
  },
  {
    value: "adhd",
    label: "TDAH",
    description: "Alto contraste, sin animaciones",
  },
  {
    value: "tea",
    label: "TEA",
    description: "Diseño predecible, minimal",
  },
  {
    value: "dyscalculia",
    label: "Discalculia",
    description: "Números monoespaciados, color-coded",
  },
];

export function ProfileSwitcher() {
  const { profile, setProfile, loading, error } = useAccessibilityProfile();
  const [isOpen, setIsOpen] = useState(false);

  const currentProfile = PROFILES.find((p) => p.value === profile);

  const handleSelectProfile = async (newProfile: AccessibilityProfile) => {
    await setProfile(newProfile);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        aria-label="Cambiar perfil de accesibilidad"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.label}>Perfil:</span>
        <span className={styles.current}>{currentProfile?.label}</span>
        <span className={styles.icon}>{isOpen ? "▲" : "▼"}</span>
        {loading && <span className={styles.spinner} />}
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox" onKeyDown={handleKeyDown}>
          {PROFILES.map((p) => (
            <button
              key={p.value}
              className={`${styles.option} ${profile === p.value ? styles.selected : ""}`}
              onClick={() => handleSelectProfile(p.value)}
              role="option"
              aria-selected={profile === p.value}
            >
              <div className={styles.optionLabel}>{p.label}</div>
              <div className={styles.optionDescription}>{p.description}</div>
            </button>
          ))}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
