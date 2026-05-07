# PRIA v7 Frontend — Next.js

Production-grade Next.js 14 frontend for PRIA v7 curriculum planning system.

**Stack:** Next.js 14, React 19, TypeScript, Tailwind CSS 4, Zustand state management, Playwright E2E tests

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+

### Setup

```bash
# Install dependencies
pnpm install

# Create .env.local (optional, defaults work)
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
pnpm dev
```

Frontend runs at: **http://localhost:3000**

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                    # Root layout, metadata, providers
│   ├── page.tsx                      # Home page (or redirect to login)
│   │
│   ├── (auth)/                       # Auth routes (public group)
│   │   ├── login/page.tsx            # Login form
│   │   ├── register/page.tsx         # Registration form
│   │   └── layout.tsx                # Auth layout (no sidebar)
│   │
│   ├── (dashboard)/                  # Protected dashboard group
│   │   ├── dashboard/page.tsx        # Dashboard home
│   │   └── layout.tsx                # Dashboard layout (with sidebar)
│   │
│   ├── (pdc)/                        # PDC (Curriculum) routes
│   │   ├── page.tsx                  # PDC list
│   │   ├── new/page.tsx              # Create new PDC
│   │   ├── [pdc_id]/page.tsx         # PDC editor
│   │   └── layout.tsx                # PDC layout
│   │
│   ├── (planning)/                   # Planning routes
│   │   ├── calendar/page.tsx         # Weekly calendar view
│   │   ├── week/[week_num]/page.tsx  # Week editor
│   │   └── layout.tsx                # Planning layout
│   │
│   ├── (export)/                     # Export routes
│   │   ├── export/page.tsx           # Export interface
│   │   └── layout.tsx                # Export layout
│   │
│   ├── api/                          # API routes (Next.js API)
│   │   ├── health/route.ts           # Health check endpoint
│   │   └── auth/[...nextauth]/route.ts  # Auth API (optional)
│   │
│   └── components/                   # Reusable React components
│       ├── accessibility/
│       │   ├── ProfileSwitcher.tsx    # Theme switcher
│       │   ├── DislexiaTheme.tsx
│       │   ├── ADHDTheme.tsx
│       │   ├── TEATheme.tsx
│       │   └── DyscalculiaTheme.tsx
│       │
│       ├── pdc/
│       │   ├── PDCEditor.tsx          # Main PDC form
│       │   ├── MESCPTable.tsx         # 6-column MESCP table
│       │   ├── AdaptacionesPanel.tsx  # Adaptations textarea
│       │   └── FileUploader.tsx       # DOCX upload
│       │
│       └── common/
│           ├── Header.tsx
│           ├── Sidebar.tsx
│           └── Loading.tsx
│
├── lib/
│   ├── api/                          # API client functions
│   │   ├── auth.ts
│   │   ├── pdc.ts
│   │   ├── planning.ts
│   │   └── export.ts
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePDC.ts
│   │   └── useAccessibility.ts
│   │
│   ├── types/                        # TypeScript types
│   │   ├── auth.ts
│   │   ├── pdc.ts
│   │   ├── planning.ts
│   │   └── accessibility.ts
│   │
│   └── utils/
│       ├── api-client.ts
│       └── formatting.ts
│
├── store/                            # Zustand state management
│   ├── authStore.ts
│   ├── pdcStore.ts
│   ├── planningStore.ts
│   ├── accessibilityStore.ts
│   └── exportStore.ts
│
├── styles/                           # Global styles
│   ├── globals.css                   # Tailwind imports
│   └── themes/                       # Accessibility themes
│       ├── dislexia.css
│       ├── adhd.css
│       ├── tea.css
│       └── dyscalculia.css
│
├── e2e/                              # Playwright E2E tests
│   └── smoke.spec.ts                 # Critical workflow tests
│
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── playwright.config.ts
├── package.json
└── README.md
```

---

## Key Features

### 1. Authentication
- **Login** — Email + password (JWT tokens)
- **Register** — Create account with role selection
- **Session** — Persist tokens in localStorage
- **Logout** — Clear tokens and redirect

### 2. PDC Management
- **List PDCs** — View all curriculum designs
- **Create PDC** — Fill subject, grade, year
- **Edit PDC** — Add/edit MESCP objectives
- **Delete PDC** — With confirmation
- **Export** — DOCX, XLSX, PDF formats

### 3. Accessibility (4 Profiles)
- **Dislexia** — OpenDyslexic font, 14pt
- **ADHD** — High contrast (#000/#FFF)
- **TEA** — Simplified layout
- **Dyscalculia** — Math-friendly typography
- **ProfileSwitcher** — Top-right corner dropdown
- **Persist** — Save to localStorage

### 4. Weekly Planning
- **Calendar View** — 16-week grid (3 trimesters)
- **Auto-Generation** — Create from PDC MESCP
- **Edit Week** — Modify moments (Inicio/Desarrollo/Cierre)
- **Copy Week** — Duplicate templates

### 5. Export
- **DOCX** — With Las Palmas school logo
- **XLSX** — With formulas
- **PDF** — Color-coded, print-friendly
- **Batch ZIP** — Multiple formats

---

## Development Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build
pnpm start

# Linting
pnpm lint

# Type check
pnpm tsc --noEmit

# E2E tests
pnpm test:e2e

# E2E UI mode
pnpm test:e2e:ui

# Coverage
pnpm test:coverage
```

---

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=PRIA v7
NEXT_PUBLIC_SCHOOL_NAME=Las Palmas
```

---

## API Integration

Type-safe API client in `lib/api/`:

```typescript
import { login, getPDCs, createPDC } from '@/lib/api';

// Login
const token = await login(email, password);

// Get PDCs
const pdcs = await getPDCs();

// Create PDC
const newPDC = await createPDC({
  subject: "LENGUAJE",
  grade: "5to primaria"
});
```

---

## State Management (Zustand)

```typescript
import { useAuthStore } from '@/store/authStore';
import { usePDCStore } from '@/store/pdcStore';
import { useAccessibilityStore } from '@/store/accessibilityStore';

const { user, login, logout } = useAuthStore();
const { pdcs, selectPDC } = usePDCStore();
const { currentProfile, applyProfile } = useAccessibilityStore();
```

---

## Styling

**Tailwind CSS** for all component styling:

```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click me
</button>
```

**Accessibility themes** override Tailwind:

- `styles/themes/dislexia.css`
- `styles/themes/adhd.css`
- `styles/themes/tea.css`
- `styles/themes/dyscalculia.css`

---

## Deployment

### Docker

```bash
docker build -f Dockerfile -t pria-v7-frontend:latest .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL="http://backend:8000" pria-v7-frontend:latest
```

### Railway

```bash
railway up --service frontend
railway logs --service frontend -f
```

---

## Testing

E2E tests with Playwright in `e2e/smoke.spec.ts`:

1. **Admin Dashboard Flow** — Register → Login → Dashboard
2. **PDC Creation & Editing** — Create → Add MESCP → Save → Reload
3. **Accessibility Profile Switching** — Switch → Apply → Persist

```bash
pnpm test:e2e
pnpm test:e2e:ui          # Interactive mode
PWDEBUG=1 pnpm test:e2e   # Debug mode
```

---

## Accessibility (WCAG 2.1 AA)

- Keyboard navigation (Tab + Enter)
- Screen reader support
- 4.5:1 color contrast
- Reduced animations respected
- Min 14px font size

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Windows
Get-NetTCPConnection -LocalPort 3000
Stop-Process -Id <PID> -Force

# Or use different port
pnpm dev -p 3001
```

### API Connection Error

```bash
# Check backend running
curl http://localhost:8000/api/health/live

# Check environment variable
echo $NEXT_PUBLIC_API_URL
```

### Build Failures

```bash
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile (iOS 14+, Android 10+)

---

## License

Proprietary — Las Palmas School 2026

---

**Last Updated:** 2026-05-07
**Maintained by:** PRIA v7 Frontend Team
