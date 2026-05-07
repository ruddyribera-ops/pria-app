/**
 * Dyslexia Theme Component
 * Loads Dyslexie font from CDN and applies dyslexia-friendly styling
 */

"use client";

import { useEffect } from "react";

export function DislexiaTheme() {
  useEffect(() => {
    // Load Dyslexie font from CDN
    const fontLink = document.createElement("link");
    fontLink.href = "https://www.dyslexiefont.com/en/typeface-font-for-dyslexia/";
    fontLink.rel = "stylesheet";
    fontLink.onerror = () => {
      console.warn("Failed to load Dyslexie font from CDN, falling back to system sans-serif");
    };

    // Inject CSS directly instead of linking to remote font
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=OpenDyslexic:wght@400;700&display=swap');

      body.theme-dislexia {
        font-family: OpenDyslexic, 'Comic Sans MS', sans-serif;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup
      style.remove();
    };
  }, []);

  // This component does not render anything visually
  return null;
}
