"""
exporters/html.py - HTML Export Functions
=========================================
HTML helpers and all HTML document generators.
"""

import base64
import io
import os
import re
import random
from datetime import datetime
from pathlib import Path


# ─── LOGO PATH ────────────────────────────────────────────────────────────────
_DIR = Path(__file__).parent.parent
LOGO_PATH = str(_DIR / "logo_laspalmas.png")
if not os.path.exists(LOGO_PATH):
    LOGO_PATH = str(Path.cwd() / "logo_laspalmas.png")


# ─── AI AUTOPRESENTACION FILTER ───────────────────────────────────────────────
_AI_INTRO_FRAGMENTS = [
    "soy el motor",
    "motor m0",
    "motor m1",
    "motor m2",
    "método palma-ribera",
    "palma-ribera",
    "he diseñado este",
    "me encanta acompañarte",
    "como experto en currículo",
    "bienvenidos, futuros",
    "a continuación te presento",
    "como motor",
    "he sido diseñado",
    "este pop quiz",
    "esta evaluación ha sido",
    "bienvenido a la",
    "estimado docente,",
    "querido estudiante,",
    "hola, soy",
    "aquí tienes",
    "a continuación encontrarás",
]


def _es_autopresentacion(linea: str) -> bool:
    ll = linea.lower()[:120]
    return any(f in ll for f in _AI_INTRO_FRAGMENTS)


def _logo_b64() -> str:
    """Return logo as base64 data URI, or empty string if not found."""
    if os.path.exists(LOGO_PATH):
        with open(LOGO_PATH, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode()
    return ""


def _md_to_html(text: str) -> str:
    """Minimal markdown → HTML: headings, bullets, bold, paragraphs."""
    if not text:
        return ""
    lines = str(text).split("\n")
    out = []
    in_ul = False

    def close_ul():
        nonlocal in_ul
        if in_ul:
            out.append("</ul>")
            in_ul = False

    def inline(s):
        s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
        return s

    for line in lines:
        s = line.strip()
        if not s:
            close_ul()
            out.append("<br>")
            continue
        if s in ("---", "___", "***") or (len(s) >= 3 and len(set(s)) == 1):
            close_ul()
            continue
        if s.startswith("### "):
            close_ul()
            out.append(f"<h3>{inline(s[4:])}</h3>")
            continue
        if s.startswith("## "):
            close_ul()
            out.append(f"<h2>{inline(s[3:])}</h2>")
            continue
        if s.startswith("# "):
            close_ul()
            out.append(f"<h1>{inline(s[2:])}</h1>")
            continue
        if s.startswith("- ") or s.startswith("* "):
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append(f"<li>{inline(s[2:])}</li>")
            continue
        close_ul()
        out.append(f"<p>{inline(s)}</p>")

    close_ul()
    return "\n".join(out)


# ─────────────────────────────────────────────────────────────────────────────
# WORKSHEET THEMES
# ─────────────────────────────────────────────────────────────────────────────

_CSS_SHARED_PRINT = """
@media print{
  @page{size:A4;margin:15mm 12mm 15mm 12mm}
  body{padding:0;font-size:10pt}
  .header{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .print-color{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .teacher-page{page-break-before:always}
  .section,.match-container,.draw-box,.fill-box,.sopa-grid,.word-bank{page-break-inside:avoid;break-inside:avoid}
  a{text-decoration:none}
}
"""

_CSS_AVENTURA = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;font-size:12pt;color:#1a1a1a;background:#fff;padding:20px}
.header{display:flex;align-items:center;gap:16px;background:#1a3a6a;color:#fff;padding:12px 20px;border-radius:8px;margin-bottom:18px}
.logo{height:56px;width:auto}
.header-text{flex:1}
.header-title{font-family:'Fredoka One',sans-serif;font-size:16pt;color:#fff}
.header-school{font-size:9pt;color:#c8e6c9;margin-top:2px}
.header-grado{font-family:'Fredoka One',sans-serif;font-size:18pt;color:#ffe082;white-space:nowrap}
.tema-title{text-align:center;font-size:17pt;font-weight:800;color:#cc2200;text-decoration:underline;margin:10px 0 16px}
.student-fields{display:flex;gap:12px;margin-bottom:14px}
.field{border:1.5px solid #90a4ae;border-radius:6px;padding:6px 12px;flex:1;font-size:11pt}
.field span{font-weight:700;color:#1a3a6a}
.field .line{border-bottom:1.5px dashed #b0bec5;display:inline-block;width:60%;margin-left:4px}
.points-bar{display:flex;align-items:center;gap:8px;background:#fff8e1;border:2px solid #ffe082;border-radius:8px;padding:8px 14px;margin-bottom:14px;font-size:11pt;font-weight:700;color:#cc5500}
.section{margin-bottom:18px}
.section-header{display:flex;align-items:center;padding:8px 14px;border-radius:6px;color:#fff;font-family:'Fredoka One',sans-serif;font-size:13pt;margin-bottom:10px}
.section-header.blue{background:#2e6da4}.section-header.teal{background:#007a6e}
.section-header.navy{background:#1a5276}.section-header.purple{background:#6a3d9a}
.section-header.orange{background:#cc5500}
.inst{font-style:italic;color:#555;font-size:10pt;margin-bottom:8px}
.gancho{background:#eef4ff;border-left:4px solid #1a3a6a;padding:10px 14px;border-radius:0 6px 6px 0;font-style:italic;margin-bottom:14px}
.mc-question{font-weight:700;font-size:11pt;margin:10px 0 4px}
.mc-options{padding-left:20px;margin-bottom:10px}
.mc-option{margin:3px 0;font-size:11pt}
.mc-option::before{content:"○  ";color:#90a4ae;font-size:13pt}
.match-table{width:100%;border-collapse:collapse;margin-bottom:12px}
.match-table th{background:#007a6e;color:#fff;padding:6px 10px;text-align:center;font-size:10pt}
.match-table td{border:1px solid #b2dfdb;padding:6px 10px;font-size:10pt;height:32px}
.match-table tr:nth-child(even) td{background:#f1f8f6}
.match-table td.word{background:#e8f5e9;font-weight:700;color:#1b5e20;text-align:center}
.match-container{display:flex;justify-content:space-between;margin:14px 0;padding:0 8px;gap:28px}
.match-col{display:flex;flex-direction:column;gap:14px;width:45%}
.match-item{display:flex;align-items:center;background:#e8f5e9;border:1.5px solid #b2dfdb;padding:8px 14px;border-radius:8px;position:relative;font-size:10pt;overflow:visible}
.match-item.left{justify-content:flex-end;text-align:right;padding-right:22px}
.match-item.right{justify-content:flex-start;text-align:left;padding-left:22px}
.node{width:12px;height:12px;background:#007a6e;border-radius:50%;position:absolute;top:50%;transform:translateY(-50%)}
.match-item.left .node{right:-7px}
.match-item.right .node{left:-7px}
.sopa-grid{display:inline-grid;gap:2px;background:#e8f5e9;padding:8px;border-radius:6px;border:1.5px solid #2e7d32;margin:8px 0}
.sopa-grid span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;font-weight:700;font-size:10pt;background:#fff;border-radius:3px}
.word-bank{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
.word-chip{background:#1a3a6a;color:#fff;padding:3px 10px;border-radius:20px;font-weight:700;font-size:10pt}
.fill-box{background:#fff8e1;border:1.5px dashed #f9a825;border-radius:6px;padding:10px 14px;font-style:italic;font-size:12pt;text-align:center;margin:8px 0 12px;line-height:2.5}
.fill-blank{display:inline-block;border-bottom:2px solid #1a3a6a;min-width:80px;margin:0 3px}
.answer-lines{margin:8px 0 12px}
.answer-line{border-bottom:1.5px dotted #b0bec5;height:30px;margin-bottom:2px}
.draw-box{border:2px dashed #90a4ae;border-radius:8px;min-height:160px;margin:8px 0 12px;background:#fafafa;display:flex;align-items:flex-end;padding:6px}
.draw-label{color:#90a4ae;font-size:9pt;font-style:italic}
.sent-row{display:flex;gap:20px;align-items:center;margin:10px 0 14px;flex-wrap:wrap}
.sent-item{display:flex;align-items:center;gap:8px;font-size:11pt}
.sent-circle{width:32px;height:32px;border-radius:50%;border:2px solid #1a3a6a;display:inline-flex;align-items:center;justify-content:center;font-size:16pt}
.teacher-page{page-break-before:always;margin-top:40px}
.teacher-banner{background:#1a5276;color:#fff;padding:10px 14px;border-radius:6px;font-family:'Fredoka One',sans-serif;font-size:13pt;margin-bottom:10px}
.confidential{color:#cc2200;font-style:italic;font-size:10pt;margin-bottom:12px}
p{margin:4px 0} ul{margin:4px 0 8px 20px} li{margin:2px 0}
h1{font-size:15pt;color:#1a3a6a} h2{font-size:13pt;color:#1a3a6a} h3{font-size:11pt;color:#1a3a6a}
"""

_CSS_CUADERNO = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;font-size:12pt;color:#3e2723;background:#fdf8f0;padding:20px}
.header{display:flex;align-items:center;gap:16px;background:#33691e;color:#fff;padding:12px 20px;border-radius:4px;margin-bottom:18px;border-bottom:5px solid #8bc34a}
.logo{height:56px;width:auto}
.header-text{flex:1}
.header-title{font-family:'Caveat',cursive;font-size:21pt;color:#fff;letter-spacing:0.5px}
.header-school{font-size:9pt;color:#dcedc8;margin-top:2px}
.header-grado{font-family:'Caveat',cursive;font-size:24pt;color:#f9a825;white-space:nowrap}
.tema-title{text-align:center;font-size:20pt;font-weight:700;color:#4e342e;font-family:'Caveat',cursive;border-bottom:3px double #a1887f;padding-bottom:6px;margin:10px 0 16px}
.student-fields{display:flex;gap:12px;margin-bottom:14px}
.field{border:1.5px solid #bcaaa4;border-radius:4px;padding:6px 12px;flex:1;font-size:11pt;background:#fffdf7}
.field span{font-weight:700;color:#4e342e}
.field .line{border-bottom:1.5px dashed #bcaaa4;display:inline-block;width:60%;margin-left:4px}
.points-bar{display:flex;align-items:center;gap:8px;background:#fff9c4;border:2px solid #f9a825;border-radius:4px;padding:8px 14px;margin-bottom:14px;font-size:11pt;font-weight:700;color:#e65100}
.section{margin-bottom:18px}
.section-header{display:flex;align-items:center;padding:8px 16px;border-radius:4px;color:#fff;font-family:'Caveat',cursive;font-size:17pt;margin-bottom:10px;letter-spacing:0.3px}
.section-header.blue{background:#558b2f}.section-header.teal{background:#00695c}
.section-header.navy{background:#5d4037}.section-header.purple{background:#6a1e4a}
.section-header.orange{background:#bf360c}
.inst{font-style:italic;color:#795548;font-size:10pt;margin-bottom:8px}
.gancho{background:#fff9c4;border-left:5px solid #f9a825;padding:10px 14px;border-radius:0 4px 4px 0;font-style:italic;margin-bottom:14px;color:#4e342e}
.mc-question{font-weight:700;font-size:11pt;margin:10px 0 4px}
.mc-options{padding-left:20px;margin-bottom:10px}
.mc-option{margin:4px 0;font-size:11pt}
.mc-option::before{content:"○  ";color:#a1887f;font-size:13pt}
.match-table{width:100%;border-collapse:collapse;margin-bottom:12px}
.match-table th{background:#558b2f;color:#fff;padding:6px 10px;text-align:center;font-family:'Caveat',cursive;font-size:13pt}
.match-table td{border:1px solid #d7ccc8;padding:6px 10px;font-size:10pt;height:34px;background:#fffdf7}
.match-table tr:nth-child(even) td{background:#f5f0e8}
.match-table td.word{background:#dcedc8;font-weight:700;color:#33691e;text-align:center}
.match-container{display:flex;justify-content:space-between;margin:14px 0;padding:0 8px;gap:28px}
.match-col{display:flex;flex-direction:column;gap:14px;width:45%}
.match-item{display:flex;align-items:center;background:#fffdf7;border:1.5px solid #d7ccc8;padding:8px 14px;border-radius:4px;position:relative;font-size:10pt;overflow:visible}
.match-item.left{justify-content:flex-end;text-align:right;padding-right:22px}
.match-item.right{justify-content:flex-start;text-align:left;padding-left:22px}
.node{width:12px;height:12px;background:#33691e;border-radius:50%;position:absolute;top:50%;transform:translateY(-50%)}
.match-item.left .node{right:-7px}
.match-item.right .node{left:-7px}
.sopa-grid{display:inline-grid;gap:2px;background:#dcedc8;padding:8px;border-radius:4px;border:1.5px solid #558b2f;margin:8px 0}
.sopa-grid span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;font-weight:700;font-size:10pt;background:#fffdf7;border-radius:2px}
.word-bank{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
.word-chip{background:#558b2f;color:#fff;padding:3px 10px;border-radius:4px;font-weight:700;font-family:'Caveat',cursive;font-size:13pt}
.fill-box{background:#fffdf7;border:2px dashed #bcaaa4;border-radius:4px;padding:10px 14px;font-style:italic;font-size:12pt;text-align:center;margin:8px 0 12px;line-height:2.8}
.fill-blank{display:inline-block;border-bottom:2px solid #5d4037;min-width:80px;margin:0 3px}
.answer-lines{margin:8px 0 12px}
.answer-line{border-bottom:2px solid #d7ccc8;height:36px;margin-bottom:0}
.draw-box{border:2px dashed #bcaaa4;border-radius:4px;min-height:168px;margin:8px 0 12px;background:#fffdf7;display:flex;align-items:flex-end;padding:6px}
.draw-label{color:#a1887f;font-size:9pt;font-style:italic}
.sent-row{display:flex;gap:20px;align-items:center;margin:10px 0 14px;flex-wrap:wrap}
.sent-item{display:flex;align-items:center;gap:8px;font-size:11pt}
.sent-circle{width:32px;height:32px;border-radius:50%;border:2px solid #558b2f;display:inline-flex;align-items:center;justify-content:center;font-size:16pt}
.teacher-page{page-break-before:always;margin-top:40px}
.teacher-banner{background:#5d4037;color:#fff;padding:10px 14px;border-radius:4px;font-family:'Caveat',cursive;font-size:17pt;margin-bottom:10px}
.confidential{color:#bf360c;font-style:italic;font-size:10pt;margin-bottom:12px}
p{margin:4px 0} ul{margin:4px 0 8px 20px} li{margin:2px 0}
h1{font-size:15pt;color:#4e342e} h2{font-size:13pt;color:#4e342e} h3{font-size:11pt;color:#5d4037}
"""

_CSS_PERIODICO = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Source Serif 4','Georgia',serif;font-size:12pt;color:#111;background:#fff;padding:20px}
.header{display:flex;align-items:center;gap:16px;background:#111;color:#fff;padding:14px 20px;border-radius:0;margin-bottom:0;border-top:6px solid #c62828;border-bottom:1px solid #333}
.logo{height:56px;width:auto;filter:brightness(0) invert(1)}
.header-text{flex:1;border-left:1px solid #444;padding-left:16px}
.header-title{font-family:'Playfair Display',serif;font-size:15pt;color:#fff;letter-spacing:0.5px}
.header-school{font-size:9pt;color:#999;margin-top:2px}
.header-grado{font-family:'Playfair Display',serif;font-size:16pt;color:#c62828;white-space:nowrap;text-align:right}
.tema-title{text-align:center;font-size:22pt;font-weight:900;color:#111;font-family:'Playfair Display',serif;border-top:3px solid #111;border-bottom:3px solid #111;padding:8px 0;margin:14px 0 18px;letter-spacing:0.5px}
.student-fields{display:flex;gap:12px;margin-bottom:14px}
.field{border:1.5px solid #111;border-radius:0;padding:6px 12px;flex:1;font-size:11pt}
.field span{font-weight:700;color:#111;font-family:'Playfair Display',serif}
.field .line{border-bottom:1.5px solid #888;display:inline-block;width:60%;margin-left:4px}
.points-bar{display:flex;align-items:center;gap:8px;background:#c62828;border:none;border-radius:0;padding:8px 14px;margin-bottom:16px;font-size:11pt;font-weight:700;color:#fff;font-family:'Playfair Display',serif}
.section{margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #ddd}
.section-header{display:flex;align-items:center;padding:8px 14px;border-radius:0;color:#fff;font-family:'Playfair Display',serif;font-size:14pt;margin-bottom:10px;border-left:6px solid #c62828}
.section-header.blue{background:#111}.section-header.teal{background:#111}
.section-header.navy{background:#111}.section-header.purple{background:#111}
.section-header.orange{background:#111}
.inst{font-style:italic;color:#555;font-size:10pt;margin-bottom:8px}
.gancho{background:#fff;border:2px solid #111;padding:16px 20px;font-style:italic;margin-bottom:14px;font-family:'Playfair Display',serif;font-size:13pt;color:#111;text-align:center;border-top:4px solid #c62828}
.mc-question{font-weight:700;font-size:11pt;margin:10px 0 4px;font-family:'Playfair Display',serif}
.mc-options{padding-left:20px;margin-bottom:10px}
.mc-option{margin:4px 0;font-size:11pt}
.mc-option::before{content:"○  ";color:#555;font-size:13pt}
.match-table{width:100%;border-collapse:collapse;margin-bottom:12px;border:2px solid #111}
.match-table th{background:#111;color:#fff;padding:6px 10px;text-align:center;font-family:'Playfair Display',serif;font-size:11pt;border:1px solid #333}
.match-table td{border:1px solid #888;padding:6px 10px;font-size:10pt;height:32px}
.match-table tr:nth-child(even) td{background:#f5f5f5}
.match-table td.word{background:#c62828;color:#fff;font-weight:700;text-align:center;border-color:#c62828}
.match-container{display:flex;justify-content:space-between;margin:14px 0;padding:0 8px;gap:28px}
.match-col{display:flex;flex-direction:column;gap:14px;width:45%}
.match-item{display:flex;align-items:center;background:#f9f9f9;border:1.5px solid #999;padding:8px 14px;border-radius:0;position:relative;font-size:10pt;overflow:visible}
.match-item.left{justify-content:flex-end;text-align:right;padding-right:22px}
.match-item.right{justify-content:flex-start;text-align:left;padding-left:22px}
.node{width:12px;height:12px;background:#111;border-radius:0;position:absolute;top:50%;transform:translateY(-50%)}
.match-item.left .node{right:-7px}
.match-item.right .node{left:-7px}
.sopa-grid{display:inline-grid;gap:1px;background:#111;padding:4px;border-radius:0;border:2px solid #111;margin:8px 0}
.sopa-grid span{display:flex;align-items:center;justify-content:center;width:26px;height:26px;font-weight:700;font-size:10pt;background:#fff;border-radius:0;font-family:'Courier New',monospace}
.word-bank{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
.word-chip{background:#111;color:#fff;padding:3px 10px;border-radius:0;font-weight:700;font-size:10pt;font-family:'Playfair Display',serif}
.fill-box{background:#f5f5f5;border:2px solid #111;border-radius:0;padding:10px 14px;font-style:italic;font-size:12pt;text-align:center;margin:8px 0 12px;line-height:2.6}
.fill-blank{display:inline-block;border-bottom:2px solid #111;min-width:90px;margin:0 3px}
.answer-lines{margin:8px 0 12px}
.answer-line{border-bottom:1.5px solid #bbb;height:32px;margin-bottom:2px}
.draw-box{border:2px solid #111;border-radius:0;min-height:160px;margin:8px 0 12px;background:#fafafa;display:flex;align-items:flex-end;padding:6px}
.draw-label{color:#888;font-size:9pt;font-style:italic}
.sent-row{display:flex;gap:20px;align-items:center;margin:10px 0 14px;flex-wrap:wrap}
.sent-item{display:flex;align-items:center;gap:8px;font-size:11pt}
.sent-circle{width:32px;height:32px;border-radius:0;border:2px solid #111;display:inline-flex;align-items:center;justify-content:center;font-size:16pt}
.teacher-page{page-break-before:always;margin-top:40px}
.teacher-banner{background:#c62828;color:#fff;padding:10px 14px;border-radius:0;font-family:'Playfair Display',serif;font-size:14pt;margin-bottom:10px;letter-spacing:0.3px}
.confidential{color:#c62828;font-style:italic;font-size:10pt;margin-bottom:12px}
p{margin:4px 0} ul{margin:4px 0 8px 20px} li{margin:2px 0}
h1{font-size:15pt;color:#111;font-family:'Playfair Display',serif}
h2{font-size:13pt;color:#111;font-family:'Playfair Display',serif}
h3{font-size:11pt;color:#111;font-family:'Playfair Display',serif}
"""

WORKSHEET_THEMES = {
    "aventura": {
        "label": "🏆 Aventura — colorido, gamificado",
        "gfonts": "family=Nunito:wght@400;600;700;800&family=Fredoka+One",
        "css": _CSS_AVENTURA + _CSS_SHARED_PRINT,
    },
    "cuaderno": {
        "label": "📓 Cuaderno de Campo — cálido, cuaderno de naturalista",
        "gfonts": "family=Nunito:wght@400;600;700;800&family=Caveat:wght@600;700",
        "css": _CSS_CUADERNO + _CSS_SHARED_PRINT,
    },
    "periodico": {
        "label": "📰 El Periódico — editorial, tipografía serif, alto contraste",
        "gfonts": "family=Playfair+Display:wght@700;900&family=Source+Serif+4:wght@400;600",
        "css": _CSS_PERIODICO + _CSS_SHARED_PRINT,
    },
}


def _generar_sopa_letras(palabras: list, size: int = 14) -> list:
    """Generate word-search grid."""
    grid = [["" for _ in range(size)] for _ in range(size)]
    letras_relleno = "ABCDEFGHIJKLMNOPRSTUVWXZ"

    words = [p.upper().replace(" ", "").replace("Ñ", "N") for p in palabras]
    words = [w for w in words if 0 < len(w) <= size]
    if not words:
        for r in range(size):
            for c in range(size):
                grid[r][c] = random.choice(letras_relleno)
        return grid

    n = len(words)
    n_horiz = max(1, round(n / 3))
    directions = ["H"] * n_horiz + ["V"] * (n - n_horiz)
    random.shuffle(directions)

    def _find_positions(word, direction):
        ln = len(word)
        over, free = [], []
        if direction == "H":
            for r in range(size):
                for c in range(size - ln + 1):
                    if all(
                        grid[r][c + i] == "" or grid[r][c + i] == word[i]
                        for i in range(ln)
                    ):
                        hits = sum(1 for i in range(ln) if grid[r][c + i] == word[i])
                        (over if hits else free).append((r, c))
        else:
            for c in range(size):
                for r in range(size - ln + 1):
                    if all(
                        grid[r + i][c] == "" or grid[r + i][c] == word[i]
                        for i in range(ln)
                    ):
                        hits = sum(1 for i in range(ln) if grid[r + i][c] == word[i])
                        (over if hits else free).append((r, c))
        return over, free

    def _place(word, direction, r, c):
        ln = len(word)
        if direction == "H":
            for i in range(ln):
                grid[r][c + i] = word[i]
        else:
            for i in range(ln):
                grid[r + i][c] = word[i]

    for word, direction in zip(words, directions):
        over, free = _find_positions(word, direction)
        pool = over if over else free
        if pool:
            r, c = random.choice(pool)
            _place(word, direction, r, c)
        else:
            alt = "V" if direction == "H" else "H"
            over2, free2 = _find_positions(word, alt)
            pool2 = over2 if over2 else free2
            if pool2:
                r, c = random.choice(pool2)
                _place(word, alt, r, c)

    for r in range(size):
        for c in range(size):
            if not grid[r][c]:
                grid[r][c] = random.choice(letras_relleno)
    return grid


def _render_html_doc(
    title: str,
    materia: str,
    tema: str,
    body_html: str,
    grado: str = "5to",
    theme: str = "aventura",
) -> str:
    """Base Las Palmas HTML document template — print-ready A4."""
    tc = WORKSHEET_THEMES.get(theme, WORKSHEET_THEMES["aventura"])
    logo = _logo_b64()
    logo_tag = (
        f'<img src="{logo}" alt="Las Palmas School" class="logo">' if logo else ""
    )
    gfonts = tc["gfonts"]
    css = tc["css"]
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title>
<link href="https://fonts.googleapis.com/css2?{gfonts}&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
<body>
<div class="header print-color">
  {logo_tag}
  <div class="header-text">
    <div class="header-title">Fichas de Trabajo · Las Palmas School</div>
    <div class="header-school">{materia}</div>
  </div>
  <div class="header-grado">{grado}<br>PRIMARIA</div>
</div>
<div class="tema-title">{tema.upper()}</div>
{body_html}
</body>
</html>"""


def _sopa_html(palabras: list, size: int = 14) -> str:
    """Generate word-search HTML as a plain <table>."""
    grid = _generar_sopa_letras(palabras, size)
    TD = (
        'style="width:28px;height:28px;text-align:center;vertical-align:middle;'
        "font-family:monospace;font-weight:bold;font-size:13px;"
        'border:1px solid #ccc;color:#1a1a1a;"'
    )
    rows = "".join(
        "<tr>" + "".join(f"<td {TD}>{grid[r][c]}</td>" for c in range(size)) + "</tr>"
        for r in range(size)
    )
    return f'<table style="border-collapse:collapse;margin:12px auto;">{rows}</table>'


# ─── EVALUACIONES HELPERS ─────────────────────────────────────────────────────


def _es_intro_eval(linea: str) -> bool:
    l = linea.lower().strip()
    intro_frags = [
        "soy el motor m2",
        "método palma-ribera",
        "he diseñado este",
        "el objetivo es evaluar de forma rápida",
        "basado en la planificación estratégica",
        "hola! soy",
        "¡hola! soy el motor",
    ]
    return any(m in l for m in intro_frags)


def _limpiar_eval(txt: str) -> str:
    salida = []
    for l in txt.split("\n"):
        if _es_intro_eval(l):
            continue
        s = l.strip()
        if s and len(set(s)) == 1 and s[0] in "-_*":
            continue
        if re.fullmatch(r"[#*]+\s*", s):
            continue
        salida.append(l)
    return "\n".join(salida)


def _parsear_secciones_eval(texto: str) -> dict:
    secciones = {"intro": [], "m1": [], "m2": [], "m3": [], "antes": []}
    actual = "intro"
    PATRONES = {
        "m1": re.compile(r"mis[ií]on\s*1|el artista|dibujo", re.I),
        "m2": re.compile(r"mis[ií]on\s*2|el historiador|escritura\s+corta", re.I),
        "m3": re.compile(r"mis[ií]on\s*3|el viajero|oral|m[ií]mica", re.I),
        "antes": re.compile(r"antes de irte|c[oó]mo te sentiste", re.I),
    }
    for linea in texto.split("\n"):
        s_raw = linea.strip()
        for key, pat in PATRONES.items():
            if pat.search(s_raw):
                actual = key
                break
        secciones[actual].append(linea)
    return {k: "\n".join(v).strip() for k, v in secciones.items()}


def _strip_hdr_eval(txt: str) -> str:
    lines = txt.split("\n")
    skip = re.compile(r"^#|mis[ií]on\s*[123]|artista|historiador|viajero", re.I)
    while lines and skip.search(lines[0].strip()):
        lines = lines[1:]
    return "\n".join(lines).strip()


def _sentiment_html() -> str:
    items = [
        ("😎", "¡Entendí todo!"),
        ("🤔", "Tengo algunas dudas"),
        ("🤯", "¡Fue mucha información!"),
    ]
    inner = "".join(
        f'<div class="sent-item"><span class="sent-circle">{e}</span><span>{t}</span></div>'
        for e, t in items
    )
    return f'<div class="sent-row">{inner}</div>'


def generar_html_evaluaciones(
    res_m2a: str, res_m2b: str, tema: str, theme: str = "aventura"
) -> str:
    """Ticket de Salida + Guía Docente como HTML."""
    texto = _limpiar_eval(res_m2a or "")
    secs = _parsear_secciones_eval(texto)

    body = []
    body.append("""<div class="student-fields">
  <div class="field"><span>Nombre:</span> <span class="line"></span></div>
  <div class="field"><span>Fecha:</span> <span class="line"></span></div>
  <div class="field"><span>Sección:</span> <span class="line"></span></div>
</div>""")
    body.append('<div class="points-bar">⭐ Puntuación: ___ / ___</div>')
    body.append('<div class="section">')
    body.append(
        '<div class="section-header blue">🎲 Pop Quiz — ¡Misión de Cierre!</div>'
    )

    if secs["intro"].strip():
        body.append(_md_to_html(secs["intro"]))

    if secs["m1"].strip():
        body.append(
            '<div class="section-header teal">🎨 Misión 1: El Artista (Dibujo)</div>'
        )
        body.append(_md_to_html(_strip_hdr_eval(secs["m1"])))
        body.append(
            '<div class="draw-box"><span class="draw-label">✏️ Dibuja tu respuesta aquí</span></div>'
        )

    if secs["m2"].strip():
        body.append(
            '<div class="section-header navy">✍️ Misión 2: El Historiador (Escritura corta)</div>'
        )
        body.append(_md_to_html(_strip_hdr_eval(secs["m2"])))
        body.append(
            '<div class="answer-lines">'
            + '<div class="answer-line"></div>' * 4
            + "</div>"
        )

    if secs["m3"].strip():
        body.append(
            '<div class="section-header purple">🗣️ Misión 3: El Viajero (Oral o Mímica)</div>'
        )
        body.append(_md_to_html(_strip_hdr_eval(secs["m3"])))

    if secs["antes"].strip():
        texto_antes = re.sub(r"[😎🤔🤯].*", "", secs["antes"]).strip()
        texto_antes = re.sub(r"\*\*", "", texto_antes)
        body.append(
            f'<p style="margin-top:12px"><strong>Antes de irte:</strong> {texto_antes}</p>'
        )
        body.append(_sentiment_html())

    body.append("</div>")

    teacher_html = ""
    if res_m2b and res_m2b.strip():
        lineas_b = [l for l in res_m2b.split("\n") if not _es_intro_eval(l)]
        teacher_html = f"""
<div class="teacher-page">
  <div class="teacher-banner">📋 CLAVE DE RESPUESTAS Y GUÍA DOCENTE — No imprimir para los estudiantes</div>
  <p class="confidential">Uso exclusivo del docente.</p>
  {_md_to_html(chr(10).join(lineas_b))}
</div>"""

    return _render_html_doc(
        title=f"Evaluación — {tema}",
        materia="Evaluación Formativa DUA",
        tema=tema,
        body_html="\n".join(body) + teacher_html,
        theme=theme,
    )


def generar_html_ficha(res_m1c: dict, tema: str, theme: str = "aventura") -> str:
    """Ficha Gamificada as print-ready HTML."""
    raw = res_m1c
    ficha = raw.get("ficha_trabajo", raw) if isinstance(raw, dict) else {}
    misiones = ficha.get("misiones", {})
    body = []

    body.append("""<div class="student-fields">
  <div class="field"><span>Nombre:</span> <span class="line"></span></div>
  <div class="field"><span>Fecha:</span> <span class="line"></span></div>
  <div class="field"><span>Sección:</span> <span class="line"></span></div>
</div>""")

    body.append('<div class="points-bar">⭐ Colecciona tus puntos: ___ / 5</div>')

    gancho = str(ficha.get("historia_gancho", "")).strip()
    if gancho:
        body.append(f'<div class="gancho">{gancho}</div>')

    body.append('<div class="section">')
    body.append('<div class="section-header blue">🔮 Misión 1: El Oráculo</div>')
    body.append(
        '<p class="inst">Lee cada pregunta y marca con ○ la respuesta correcta.</p>'
    )
    for q in misiones.get("oraculo", []):
        pregunta = str(q.get("pregunta", ""))
        opts = q.get("opciones", [])
        body.append(f'<div class="mc-question">{pregunta}</div>')
        body.append('<div class="mc-options">')
        letras = ["A)", "B)", "C)", "D)"]
        for j, opt in enumerate(opts):
            clean_opt = str(opt).lstrip("abcdefgABCDEFG) ").replace("**", "")
            body.append(f'<div class="mc-option">{letras[j]} {clean_opt}</div>')
        body.append("</div>")
    body.append("</div>")

    puente = misiones.get("puente", [])
    if puente:
        import random as _rnd

        defs_mezcladas = [p.get("significado", "") for p in puente]
        _rnd.shuffle(defs_mezcladas)
        body.append('<div class="section">')
        body.append('<div class="section-header teal">🌉 Misión 2: El Puente</div>')
        body.append(
            '<p class="inst">Une con una línea cada palabra con su significado.</p>'
        )
        left_items = "".join(
            f'<div class="match-item left">{str(par.get("palabra", ""))}<span class="node"></span></div>'
            for par in puente
        )
        right_items = "".join(
            f'<div class="match-item right"><span class="node"></span>{defs_mezcladas[k] if k < len(defs_mezcladas) else ""}</div>'
            for k in range(len(puente))
        )
        body.append(
            f'<div class="match-container">'
            f'<div class="match-col">{left_items}</div>'
            f'<div class="match-col">{right_items}</div>'
            f"</div>"
        )
        body.append("</div>")

    palabras_sopa = misiones.get("sopa", [])
    if palabras_sopa:
        body.append('<div class="section">')
        body.append(
            '<div class="section-header navy">🥣 Misión 3: Sopa de Letras</div>'
        )
        body.append('<p class="inst">Encuentra y encierra las siguientes palabras.</p>')
        chips = "".join(f'<span class="word-chip">{p}</span>' for p in palabras_sopa)
        body.append(f'<div class="word-bank">{chips}</div>')
        body.append(_sopa_html(palabras_sopa))
        body.append("</div>")

    per = misiones.get("pergamino", {})
    frase = str(per.get("frase_con_espacios", "")).strip()
    palabras_secretas = per.get("palabras_secretas", [])
    if frase:
        body.append('<div class="section">')
        body.append(
            '<div class="section-header purple">📜 Misión 4: El Pergamino</div>'
        )
        body.append(
            '<p class="inst">Completa la frase usando las palabras del banco.</p>'
        )
        frase_html = re.sub(
            r"_{3,}",
            '<span class="fill-blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>',
            frase,
        )
        body.append(f'<div class="fill-box">{frase_html}</div>')
        if palabras_secretas:
            chips = "".join(
                f'<span class="word-chip">{p}</span>' for p in palabras_secretas
            )
            body.append(
                f'<p class="inst">Banco de palabras:</p><div class="word-bank">{chips}</div>'
            )
        body.append("</div>")

    lienzo_inst = str(
        misiones.get("lienzo", "Crea tu obra de arte basándote en lo aprendido.")
    ).replace("**", "")
    body.append('<div class="section">')
    body.append('<div class="section-header orange">🎨 Misión 5: El Lienzo</div>')
    body.append(f"<p>{lienzo_inst}</p>")
    body.append(
        '<div class="draw-box"><span class="draw-label">✏️ Dibuja o escribe tu respuesta aquí</span></div>'
    )
    body.append("</div>")

    adapt = ficha.get("adaptaciones_por_mision", [])
    if adapt:
        body.append('<div class="teacher-page">')
        body.append(
            '<div class="teacher-banner">📋 ANEXO DOCENTE — Adaptaciones por Misión</div>'
        )
        body.append(
            '<p class="confidential">Esta página es solo para el docente. No imprimir para los estudiantes.</p>'
        )
        if isinstance(adapt[0], dict):
            cols = list(adapt[0].keys())
            body.append('<table class="match-table"><tr>')
            for c in cols:
                body.append(f"<th>{c}</th>")
            body.append("</tr>")
            for row in adapt:
                body.append("<tr>")
                for c in cols:
                    body.append(f"<td>{row.get(c, '')}</td>")
                body.append("</tr>")
            body.append("</table>")
        else:
            body.append("<ul>" + "".join(f"<li>{str(a)}</li>" for a in adapt) + "</ul>")
        body.append("</div>")

    return _render_html_doc(
        title=f"Ficha Gamificada — {tema}",
        materia="Ficha Gamificada",
        tema=tema,
        body_html="\n".join(body),
        theme=theme,
    )


# ─────────────────────────────────────────────────────────────────────────────
# HTML PLAN DOCUMENT GENERATORS
# ─────────────────────────────────────────────────────────────────────────────


def _render_plan_doc(title: str, subtitle: str, body_html: str) -> bytes:
    fecha = datetime.now().strftime("%d/%m/%Y")
    logo_tag = ""
    if os.path.exists(LOGO_PATH):
        with open(LOGO_PATH, "rb") as _f:
            _b64s = base64.b64encode(_f.read()).decode()
        logo_tag = (
            f'<img src="data:image/png;base64,{_b64s}" style="height:44px;width:auto">'
        )
    html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>{title}</title>
<style>*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',Calibri,Arial,sans-serif;font-size:11pt;color:#1A1A1A;background:#fff;padding:28px 36px}}
.doc-header{{display:flex;align-items:center;gap:16px;background:#1A3A6A;color:#fff;padding:14px 20px;border-radius:8px;margin-bottom:8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.doc-header-main{{font-size:14pt;font-weight:700}}
.doc-header-sub{{font-size:9pt;color:#C8E6C9;margin-top:3px}}
.doc-title{{font-size:18pt;font-weight:700;color:#CC2200;text-align:center;margin:14px 0 6px;text-decoration:underline;text-underline-offset:4px;text-transform:uppercase}}
h1{{color:#1A3A6A;font-size:14pt;margin:18px 0 6px;border-bottom:2px solid #E3F0FF;padding-bottom:4px}}
h2{{color:#1A3A6A;font-size:12pt;margin:12px 0 5px}}
h3{{color:#2E7D32;font-size:11pt;margin:9px 0 4px}}
p{{margin:5px 0 8px;line-height:1.5}}
ul,ol{{margin:6px 0 10px;padding-left:24px}}
li{{margin:3px 0;line-height:1.5}}
.banner{{background:#1A3A6A;color:#fff;padding:7px 14px;border-radius:6px;font-weight:700;font-size:11pt;margin:14px 0 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.banner.teal{{background:#007A6E}}
.banner.navy2{{background:#1A5276}}
table{{border-collapse:collapse;width:100%;margin:10px 0}}
th{{background:#1A3A6A;color:#fff;padding:7px 10px;text-align:left;font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
td{{border:1px solid #DDD;padding:7px 10px;font-size:10pt}}
tr:nth-child(even) td{{background:#F1F8E9}}
blockquote{{border-left:4px solid #007A6E;padding:6px 12px;background:#F0FAF8;font-style:italic;margin:8px 0}}
hr{{border:none;border-top:1px solid #DDD;margin:16px 0}}
@media print{{@page{{size:A4;margin:15mm 12mm}}body{{padding:0;font-size:10pt}}}}
</style></head><body>
<div class="doc-header">{logo_tag}
  <div style="flex:1">
    <div class="doc-header-main">Las Palmas School — PRIA</div>
    <div class="doc-header-sub">{subtitle}</div>
  </div>
  <div style="color:#C8E6C9;font-size:9pt">{fecha}</div>
</div>
<div class="doc-title">{title}</div>
{body_html}
</body></html>"""
    return html.encode("utf-8")


def _md_to_plan_html(texto: str) -> str:
    if not texto:
        return ""
    out = []
    in_ul = False
    for line in texto.split("\n"):
        s = line.strip()
        if _es_autopresentacion(s):
            continue
        if not s:
            if in_ul:
                out.append("</ul>")
                in_ul = False
            continue
        if s in ("---", "___", "***") or (len(s) >= 3 and all(c == "-" for c in s)):
            if in_ul:
                out.append("</ul>")
                in_ul = False
            out.append("<hr>")
            continue
        s_h = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
        s_h = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s_h)
        if s.startswith("### "):
            out.append(f"<h3>{s_h[4:]}</h3>") if not in_ul else (
                out.append("</ul>"),
                out.append(f"<h3>{s_h[4:]}</h3>"),
            )
            in_ul = False
        elif s.startswith("## "):
            out.append(f"<h2>{s_h[3:]}</h2>") if not in_ul else (
                out.append("</ul>"),
                out.append(f"<h2>{s_h[3:]}</h2>"),
            )
            in_ul = False
        elif s.startswith("# "):
            out.append(f"<h1>{s_h[2:]}</h1>") if not in_ul else (
                out.append("</ul>"),
                out.append(f"<h1>{s_h[2:]}</h1>"),
            )
            in_ul = False
        elif s.startswith("> "):
            if in_ul:
                out.append("</ul>")
                in_ul = False
            out.append(f"<blockquote>{s_h[2:]}</blockquote>")
        elif s.startswith("- ") or s.startswith("* "):
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append(f"<li>{s_h[2:]}</li>")
        else:
            if in_ul:
                out.append("</ul>")
                in_ul = False
            out.append(f"<p>{s_h}</p>")
    if in_ul:
        out.append("</ul>")
    return "\n".join(out)


def _lst(v) -> list:
    return v if isinstance(v, list) else ([v] if v else [])


def generar_html_sintesis(res_m0a: dict, diagnosticos: str) -> bytes:
    unidad = res_m0a.get("unidad_sintetizada", {})
    titulo = unidad.get("titulo", "Síntesis de Unidad")
    body = f"<h1>Perfil Neuro-Inclusivo del Aula</h1><p>{diagnosticos}</p>"
    body += "<h1>Temas de la Unidad</h1>"
    for tema in unidad.get("temas_desarrollados", []):
        nombre = tema.get("nombre", "Tema")
        body += f"<h2>{nombre}</h2>"
        ccs = _lst(tema.get("conceptos_clave") or tema.get("conceptos") or [])
        if ccs:
            body += (
                "<strong>Conceptos Clave:</strong><ul>"
                + "".join(f"<li>{c}</li>" for c in ccs)
                + "</ul>"
            )
        ims = _lst(
            tema.get("inteligencias_sugeridas") or tema.get("inteligencias") or []
        )
        if ims:
            body += (
                "<strong>Inteligencias Múltiples:</strong><ul>"
                + "".join(f"<li>{i}</li>" for i in ims)
                + "</ul>"
            )
    body += f"<h1>Notas DUA del Docente</h1>{_md_to_plan_html(unidad.get('notas_docente', ''))}"
    body += f"<h1>Proyecto ABP — Resumen</h1>{_md_to_plan_html(unidad.get('proyecto_pbl', ''))}"
    return _render_plan_doc("Síntesis Curricular", titulo, body)


def generar_html_abp(res_m0b: str, res_m0c: str, titulo_unidad: str) -> bytes:
    body = '<div class="banner">📋 Diseño del Proyecto ABP</div>'
    body += _md_to_plan_html(res_m0b or "No generado.")
    body += '<div class="banner teal">📊 Rúbrica y Fichas de Proceso</div>'
    body += _md_to_plan_html(res_m0c or "No generado.")
    return _render_plan_doc("Proyecto ABP", titulo_unidad, body)


def generar_html_plan_clase(res_m1a: dict, tema: str, diagnosticos: str) -> bytes:
    body = ""
    verbos = res_m1a.get("mapa_cognitivo", {}).get("verbos", [])
    if verbos:
        body += "<h1>Verbos Operativos (Taxonomía Bloom)</h1><ul>"
        body += "".join(f"<li>{v}</li>" for v in verbos) + "</ul>"
    im = res_m1a.get("inteligencias_multiples", [])
    if im and isinstance(im, list) and im and isinstance(im[0], dict):
        cols = list(im[0].keys())
        body += "<h1>Inteligencias Múltiples</h1><table>"
        body += "<tr>" + "".join(f"<th>{c}</th>" for c in cols) + "</tr>"
        for row in im:
            body += (
                "<tr>" + "".join(f"<td>{row.get(c, '')}</td>" for c in cols) + "</tr>"
            )
        body += "</table>"
    body += '<div class="banner">⏱️ Secuencia Didáctica</div>'
    for bloque in res_m1a.get("secuencia_didactica", {}).get("bloques", []):
        nb = bloque.get("nombre", "Bloque")
        dur = bloque.get("duracion", "?")
        body += f"<h2>{nb} — {dur} min</h2><p>{bloque.get('objetivo', '')}</p>"
        if "nota" in bloque:
            body += f"<blockquote>💡 {bloque['nota']}</blockquote>"
    body += '<div class="banner teal">🧠 Directrices DUA / Neuro-Inclusión</div><ul>'
    body += (
        "".join(f"<li>{d}</li>" for d in _lst(res_m1a.get("dua_neuroinclusion", [])))
        + "</ul>"
    )
    adapt = res_m1a.get("tabla_adaptaciones_clase", [])
    if adapt and isinstance(adapt, list) and adapt and isinstance(adapt[0], dict):
        cols = list(adapt[0].keys())
        body += '<div class="banner navy2">♿ Adaptaciones por Diagnóstico</div>'
        body += "<table><tr>" + "".join(f"<th>{c}</th>" for c in cols) + "</tr>"
        for row in adapt:
            body += (
                "<tr>" + "".join(f"<td>{row.get(c, '')}</td>" for c in cols) + "</tr>"
            )
        body += "</table>"
    body += f"<h1>Perfil del Aula</h1><p>{res_m1a.get('perfil_aula_resumido', diagnosticos)}</p>"
    return _render_plan_doc("Plan de Clase · 45 minutos", tema, body)


def generar_html_pdc(
    resultado_pdc: str, teacher: str, subject: str, level: str
) -> bytes:
    return _render_plan_doc(
        "PDC Trimestral",
        f"{subject} — {teacher} — {level}",
        _md_to_plan_html(resultado_pdc or "No generado."),
    )
