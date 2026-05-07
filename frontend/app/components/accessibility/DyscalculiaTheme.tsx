/**
 * Dyscalculia Theme Component
 * Monospace numbers, color-coded by magnitude, tens-frames, concrete language
 */

"use client";

import { useEffect } from "react";

export function DyscalculiaTheme() {
  useEffect(() => {
    // Inject Dyscalculia-specific CSS
    const style = document.createElement("style");
    style.textContent = `
      body.theme-dyscalculia {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 12pt;
        line-height: 1.6;
      }

      /* Monospace numbers */
      body.theme-dyscalculia .number,
      body.theme-dyscalculia [data-type="number"],
      body.theme-dyscalculia .digit {
        font-family: 'Courier New', 'Courier', monospace;
        font-weight: bold;
      }

      /* Color by magnitude */
      body.theme-dyscalculia .number.single,
      body.theme-dyscalculia [data-magnitude="single"] {
        color: #0066FF;
      }

      body.theme-dyscalculia .number.double,
      body.theme-dyscalculia [data-magnitude="double"] {
        color: #FF6600;
      }

      body.theme-dyscalculia .number.triple,
      body.theme-dyscalculia [data-magnitude="triple"] {
        color: #DD0000;
      }

      /* Tens frame layout */
      body.theme-dyscalculia .tens-frame,
      body.theme-dyscalculia [data-frame="tens"] {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 4px;
        padding: 8px;
        border: 2px solid #000;
        background: #FFF;
      }

      body.theme-dyscalculia .tens-frame .cell,
      body.theme-dyscalculia [data-frame="tens"] > div {
        width: 40px;
        height: 40px;
        border: 1px solid #999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        cursor: pointer;
      }

      body.theme-dyscalculia .tens-frame .cell.filled,
      body.theme-dyscalculia [data-frame="tens"] > div.filled {
        background: #0066FF;
        color: #FFF;
      }

      body.theme-dyscalculia .tens-frame .cell:hover {
        background: #E8F0FF;
      }

      /* Concrete language support */
      body.theme-dyscalculia .concrete-label {
        font-weight: bold;
        color: #000;
      }

      /* Input grids */
      body.theme-dyscalculia input[type="text"],
      body.theme-dyscalculia input[type="number"] {
        font-family: 'Courier New', monospace;
        font-size: 14pt;
        text-align: center;
        padding: 8px;
      }

      /* Visual manipulatives */
      body.theme-dyscalculia .manipulative {
        display: inline-block;
        margin: 4px;
      }

      body.theme-dyscalculia .block {
        width: 30px;
        height: 30px;
        background: #0066FF;
        border: 2px solid #000;
        display: inline-block;
        margin: 2px;
      }

      body.theme-dyscalculia .dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #FF6600;
        display: inline-block;
        margin: 4px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  return null;
}
