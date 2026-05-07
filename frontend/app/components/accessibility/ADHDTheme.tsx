/**
 * ADHD Theme Component
 * High contrast + color-coded interface with no animations
 */

"use client";

import { useEffect } from "react";

export function ADHDTheme() {
  useEffect(() => {
    // Inject ADHD-specific CSS
    const style = document.createElement("style");
    style.textContent = `
      body.theme-adhd {
        font-size: 13pt;
        line-height: 1.6;
        color: #000;
        background: #FFF;
      }

      body.theme-adhd * {
        transition: none !important;
      }

      body.theme-adhd :focus {
        outline: 3px solid #0066FF !important;
        outline-offset: 2px;
      }

      body.theme-adhd a:focus,
      body.theme-adhd button:focus {
        outline: 3px solid #0066FF !important;
      }

      body.theme-adhd .section,
      body.theme-adhd [role="region"] {
        border-left: 4px solid #0066FF;
        padding-left: 12px;
      }

      body.theme-adhd .success,
      body.theme-adhd [data-status="success"] {
        color: #00AA00 !important;
      }

      body.theme-adhd .warning,
      body.theme-adhd [data-status="warning"] {
        color: #FF6600 !important;
      }

      body.theme-adhd .error,
      body.theme-adhd [data-status="error"] {
        color: #CC0000 !important;
      }

      body.theme-adhd .progress-bar {
        background: linear-gradient(90deg, #0066FF, #FF6600) !important;
      }

      body.theme-adhd button,
      body.theme-adhd [role="button"] {
        font-weight: bold;
        padding: 10px 20px;
        border: 2px solid #000;
      }

      body.theme-adhd b,
      body.theme-adhd strong,
      body.theme-adhd .keyword {
        font-weight: bold;
        color: #0066FF;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  return null;
}
