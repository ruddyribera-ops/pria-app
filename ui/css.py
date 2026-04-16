"""
ui/css.py - PRIA Design System CSS
=================================
Streamlit-compatible dark theme CSS.
"""

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

:root {
    --bg:       #0D0F12;
    --surface:  #16191D;
    --surface2: #1E2128;
    --border:   #2A2D35;
    --border2:  #3A3D48;
    --blue:     #00C2FF;
    --emerald:  #34C759;
    --amber:    #FF9500;
    --crimson:  #FF3B30;
    --text-1:   #E8EAF0;
    --text-2:   #9DA3B4;
    --text-3:   #6B7185;
    --g900: #1B5E20; --g700: #2E7D32; --g500: #43A047;
    --g300: #81C784; --g100: #C8E6C9; --g50: #E8F5E9;
    --shadow-xs: 0 1px 3px rgba(0,0,0,0.3);
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.4);
    --shadow-md: 0 4px 20px rgba(0,0,0,0.5);
    --shadow-lg: 0 8px 40px rgba(0,0,0,0.6);
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
    --transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
}

html, body, .stApp {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    background: var(--bg) !important;
    min-height: 100vh;
}
.main .block-container {
    padding-top: 2rem !important;
    max-width: 1200px;
}

h1 { font-size: 2rem !important; font-weight: 800 !important; color: var(--text-1) !important; letter-spacing: -0.5px; }
h2 { color: var(--text-1) !important; font-weight: 700 !important; font-size: 1.3rem !important;
     border-left: 3px solid var(--blue); padding-left: 0.6rem; margin-top: 1.2rem !important; }
h3 { color: var(--text-1) !important; font-weight: 600 !important; font-size: 1.1rem !important; }
h4, h5, h6 { color: var(--text-2) !important; font-weight: 600 !important; }
body, p, span, li, div, td, th, caption, label, small, em, strong, blockquote,
.stMarkdown, .stText, .stCaption, div[data-testid="stMarkdownContainer"],
div[data-testid="stMarkdownContainer"] *, div[data-testid="stWidgetLabel"] p,
div[data-testid="stWidgetLabel"] span { color: var(--text-1) !important; }

div[data-testid="stTabs"] [role="tablist"] { gap: 4px !important; background: var(--surface) !important;
    border-radius: var(--radius-md) !important; padding: 5px !important; border: 1px solid var(--border) !important; }
button[data-baseweb="tab"] { border-radius: var(--radius-sm) !important; padding: 0.45rem 1.1rem !important;
    font-weight: 600 !important; font-size: 0.85rem !important; transition: var(--transition) !important;
    border: none !important; color: var(--text-2) !important; background: transparent !important; }
button[data-baseweb="tab"][aria-selected="true"] { background: var(--surface2) !important;
    color: var(--text-1) !important; box-shadow: var(--shadow-sm) !important; }

.stButton > button { background: var(--surface2) !important; color: var(--text-1) !important;
    font-weight: 600 !important; font-size: 0.88rem !important; border: 1px solid var(--border2) !important;
    border-radius: var(--radius-sm) !important; padding: 0.55rem 1.4rem !important;
    height: auto !important; min-height: 2.6rem !important; transition: var(--transition) !important; }
.stButton > button:hover { background: var(--border) !important; border-color: var(--blue) !important;
    color: var(--blue) !important; transform: translateY(-1px) !important; }
.stButton > button[kind="primary"] { background: var(--blue) !important; color: #000 !important;
    border: none !important; font-weight: 700 !important; }
.stButton > button[kind="primary"]:hover { background: #33CFFF !important; color: #000 !important;
    border: none !important; transform: translateY(-1px) !important; }

input[type="text"], input[type="number"], textarea { background-color: var(--surface) !important;
    color: var(--text-1) !important; border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm) !important; transition: var(--transition) !important; }
input[type="text"]:focus, input[type="number"]:focus, textarea:focus { border-color: var(--blue) !important;
    box-shadow: 0 0 0 2px rgba(0,194,255,0.15) !important; outline: none !important; }
div[data-baseweb="select"] > div, div[data-baseweb="select"] span { background-color: var(--surface) !important;
    color: var(--text-1) !important; border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm) !important; }
ul[data-baseweb="menu"] { background-color: var(--surface2) !important; border-radius: var(--radius-sm) !important;
    box-shadow: var(--shadow-md) !important; border: 1px solid var(--border) !important; }
ul[data-baseweb="menu"] li, ul[data-baseweb="menu"] li span { color: var(--text-1) !important; }
ul[data-baseweb="menu"] li:hover { background-color: var(--border) !important; }

div[data-testid="stExpander"] { background: var(--surface) !important; border: 1px solid var(--border) !important;
    border-radius: var(--radius-md) !important; margin-bottom: 0.6rem !important; overflow: hidden !important;
    border-left: 3px solid var(--border2) !important; transition: var(--transition) !important; }
details summary p, details summary span, div[data-testid="stExpander"] summary p { color: var(--text-2) !important;
    font-weight: 600 !important; font-size: 0.9rem !important; }
div[data-testid="stVerticalBlockBorderWrapper"] { background: var(--surface) !important;
    border: 1px solid var(--border) !important; border-radius: var(--radius-md) !important; }

div[data-testid="stAlert"] { border-radius: var(--radius-sm) !important; border-width: 0 !important;
    border-left-width: 3px !important; border-left-style: solid !important; }
div[data-testid="stAlert"][data-baseweb="notification"][kind="info"] { border-left-color: var(--blue) !important;
    background: rgba(0,194,255,0.07) !important; }
div[data-testid="stAlert"][data-baseweb="notification"][kind="success"] { border-left-color: var(--emerald) !important;
    background: rgba(52,199,89,0.07) !important; }
div[data-testid="stAlert"][data-baseweb="notification"][kind="warning"] { border-left-color: var(--amber) !important;
    background: rgba(255,149,0,0.07) !important; }
div[data-testid="stAlert"][data-baseweb="notification"][kind="error"] { border-left-color: var(--crimson) !important;
    background: rgba(255,59,48,0.07) !important; }

div[data-testid="stMetric"] { background: var(--surface) !important; border-radius: var(--radius-md) !important;
    padding: 1rem 1.2rem !important; border: 1px solid var(--border) !important;
    border-top: 2px solid var(--blue) !important; }
div[data-testid="stMetricValue"] { font-size: 1.8rem !important; font-weight: 800 !important; color: var(--text-1) !important; }
div[data-testid="stMetricLabel"] { font-weight: 500 !important; color: var(--text-2) !important;
    font-size: 0.78rem !important; text-transform: uppercase !important; letter-spacing: 0.06em !important; }

.stDataFrame { border-radius: var(--radius-md) !important; border: 1px solid var(--border) !important; overflow: hidden !important; }
.stDataFrame th { background: var(--surface2) !important; font-weight: 700 !important; font-size: 0.8rem !important;
    text-transform: uppercase !important; letter-spacing: 0.04em !important; color: var(--text-2) !important; }
.stDataFrame tr:hover td { background: var(--surface2) !important; }

section[data-testid="stSidebar"] { background: var(--surface) !important; border-right: 1px solid var(--border) !important; }
section[data-testid="stSidebar"] * { color: var(--text-1) !important; }

div[data-testid="stDownloadButton"] > button { background: var(--emerald) !important; color: #000 !important;
    font-weight: 700 !important; border-radius: var(--radius-sm) !important; border: none !important; }

.aid-day-header { background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 12px 18px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
.aid-day-header__left { display: flex; flex-direction: column; gap: 1px; }
.aid-day-header__title { font-size: 1.05rem; font-weight: 800; color: #E8EAF0; letter-spacing: -0.3px; }
.aid-day-header__sub { font-size: 0.75rem; font-weight: 500; color: #9DA3B4; }
.aid-day-header__right { display: flex; align-items: center; gap: 20px; }
.aid-day-header__cycle { font-size: 0.65rem; font-weight: 700; color: #00C2FF;
    letter-spacing: 0.1em; text-transform: uppercase; }
.aid-day-header__daycount { font-size: 0.68rem; font-weight: 600; color: #6B7185; letter-spacing: 0.04em; }
.aid-day-header__pct { font-size: 1.5rem; font-weight: 800; color: #E8EAF0; line-height: 1; }

.aid-badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 700;
    letter-spacing: 0.07em; text-transform: uppercase; vertical-align: middle; flex-shrink: 0; }
.aid-badge--closed { background: rgba(52,199,89,0.12); color: #34C759; }
.aid-badge--active { background: rgba(0,194,255,0.12); color: #00C2FF; }
.aid-badge--pending { background: rgba(255,149,0,0.12); color: #FF9500; }

.aid-time { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 0.8rem; font-weight: 600;
    color: #9DA3B4; letter-spacing: 0.02em; }
</style>
"""
