/**
 * TEA (Autism) Theme Component
 * Predictable grid layout, minimal clutter, consistent spacing
 */

"use client";

import { useEffect } from "react";

export function TEATheme() {
  useEffect(() => {
    // Inject TEA-specific CSS
    const style = document.createElement("style");
    style.textContent = `
      body.theme-tea {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
        background: #FFF;
      }

      body.theme-tea * {
        transition: none !important;
        box-shadow: none !important;
      }

      body.theme-tea main,
      body.theme-tea .main-content {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
      }

      body.theme-tea button,
      body.theme-tea [role="button"],
      body.theme-tea a.button {
        padding: 12px 24px;
        border: 2px solid #000;
        font-weight: bold;
        text-decoration: none;
      }

      body.theme-tea button:hover,
      body.theme-tea [role="button"]:hover {
        background-color: #F0F0F0;
      }

      body.theme-tea .section,
      body.theme-tea [role="region"] {
        border: 2px solid #000;
        padding: 16px;
        background: #FFF;
      }

      body.theme-tea h1,
      body.theme-tea h2,
      body.theme-tea h3,
      body.theme-tea h4 {
        margin-top: 16px;
        margin-bottom: 8px;
      }

      body.theme-tea p {
        margin: 8px 0;
      }

      body.theme-tea li {
        margin: 8px 0;
      }

      body.theme-tea table {
        border-collapse: collapse;
        width: 100%;
      }

      body.theme-tea td,
      body.theme-tea th {
        border: 1px solid #000;
        padding: 8px;
        text-align: left;
      }

      body.theme-tea :focus {
        outline: 3px solid #000 !important;
        outline-offset: 2px;
      }

      /* Text-only labels: hide icons unless there's accompanying text */
      body.theme-tea [aria-label]:not([title]) {
        position: relative;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  return null;
}
