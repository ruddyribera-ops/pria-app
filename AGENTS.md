# PRIA v10 — Project-Specific Rules

## Language
- Spanish-first (Ruddy's preference)
- Technical terms in English

## Tech Stack
- React 19 + TypeScript + Vite 8
- React Router 7
- Axios (HTTP client with JWT interceptor)
- CSS (inline styles, matching Codecademy design system)

## API
- Base: https://steadfast-alignment-production.up.railway.app
- Auth: JWT Bearer token
- Login: POST /api/auth/login { usuario, contrasena }
- Mock fallback: admin / cualquier-contraseña

## Design System (Codecademy)
- Sidebar: #1c1e24, 260px, green left-border active indicator
- Primary: #3A9E5E (green)
- Main bg: #ffffff
- Cards: 1px solid #e6e6eb, radius 8px
- Font: Inter (Google Fonts)
- Avatar: initials in green circle

## Commands
- Dev: npm run dev
- Build: npm run build
- Type check: npx tsc --noEmit

## Critical Rules
1. NEVER modify the backend API contract — it's live on Railway
2. Mock data fallback is REQUIRED for every API call
3. Login sends { usuario, contrasena } NOT { email, password }
4. 401 interceptor skips mock tokens (prefix "mock-") to prevent redirect loops
5. Sidebar shows Admin only if rol=admin
6. Estado del Sistema = collapsible, 7 motors with colored status dots
