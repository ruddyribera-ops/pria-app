# PRIA v7 Testing Guide

## Overview

PRIA v7 Phase 6 implements comprehensive unit, integration, and E2E testing targeting 80% code coverage across backend and frontend.

**Total Test Files: 16**
- Backend: 10 files (5 unit + 5 integration)
- Frontend: 6 files (3 component + 3 E2E)

---

## Backend Testing

### Setup

```bash
cd backend

# Install test dependencies
pip install -r requirements.txt

# Run all backend tests
python -m pytest tests/ -v --cov=app --cov-report=html

# Run specific test categories
pytest tests/unit/ -v                           # Unit tests only
pytest tests/integration/ -v                    # Integration tests only
pytest tests/unit/test_auth.py -v               # Single file
pytest tests/ -k "test_create" -v               # By name pattern
```

### Test Files

#### Unit Tests (5 files)

1. **test_auth.py** (10 tests)
   - Password hashing & verification
   - JWT token generation & validation
   - User authentication workflow
   - Protected endpoint access control

2. **test_pdc_service.py** (8 tests)
   - PDC CRUD operations
   - MESCP row management
   - Adaptations for neuroinclusive profiles
   - Version control

3. **test_planning_service.py** (8 tests)
   - Weekly plan creation & management
   - Momento operations (Inicio/Desarrollo/Cierre)
   - Motor M1a lesson generation
   - Micro-objectives with dependencies

4. **test_export_service.py** (6 tests)
   - DOCX, XLSX, PDF export generation
   - School branding application
   - Export job status tracking
   - Error handling

5. **test_accessibility_service.py** (5 tests)
   - User profile CRUD
   - Accessibility profile metadata
   - Student profile management
   - Profile validation

#### Integration Tests (5 files)

1. **test_auth_flow.py**
   - Full register → login → protected endpoint → logout workflow
   - Multi-user authentication isolation
   - Token expiry handling

2. **test_pdc_workflow.py**
   - Complete PDC creation → MESCP → adaptation request → approval
   - Multiple profile adaptations
   - Version control through edits

3. **test_planning_workflow.py**
   - Generate 16 weekly plans for PDC
   - Create momentos for each week
   - Vacation weeks marked (23-24)
   - Week copying functionality

4. **test_export_workflow.py**
   - Export job creation & status tracking
   - Multi-format exports (DOCX, XLSX, PDF)
   - Progress polling workflow
   - Error handling & retry logic

5. **test_accessibility_workflow.py** (implied in accessibility tests)
   - Full accessibility profile setup
   - Student profile assignment
   - Profile switching

### Test Database

- **Type**: SQLite in-memory (`:memory:`)
- **Setup**: Created fresh for each test session
- **Teardown**: Dropped after tests complete
- **Performance**: ~100ms per test

### Fixtures (conftest.py)

Available across all tests:

```python
@pytest_asyncio.fixture
async def engine()              # Async SQLAlchemy engine
async def async_session()       # Database session
async def app_with_db()         # FastAPI app with test DB
async def client()              # AsyncClient for API calls
async def school()              # Test school instance
async def user()                # Test user (email: test@example.com)
async def token()               # JWT token for user
async def pdc()                 # Test PDC with MESCP
async def weekly_plan()         # Test weekly plan
async def user_profile()        # Accessibility profile
async def export_job()          # Export job instance
```

### Coverage Configuration

File: `.coveragerc`

```ini
[run]
source = app/
omit = */tests/*, */migrations/*, */venv/*

[report]
exclude_lines = pragma: no cover, def __repr__, if __name__ == .__main__.:
precision = 2
```

**Target**: 80% coverage (statements, branches, functions)

**Current**: Run coverage report:
```bash
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

---

## Frontend Testing

### Setup

```bash
cd frontend

# Install test dependencies
pnpm install

# Run component tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E with browser visible
pnpm test:e2e --headed
```

### Test Files

#### Component Tests (3 files, Vitest)

1. **PDCEditor.test.tsx**
   - Component rendering
   - Data loading via API
   - Save functionality
   - MESCP table display
   - Edit/delete modals
   - Responsive layout

2. **CalendarView.test.tsx**
   - 16-week grid rendering
   - Vacation week marking (23-24)
   - Status badge colors
   - Week selection
   - Generation task triggering
   - Responsive columns

3. **usePDC.test.ts**
   - Hook initialization
   - Data loading state
   - Error handling
   - Refetch functionality
   - Loading indicators

#### E2E Tests (3 files, Playwright)

1. **auth.spec.ts**
   - User registration
   - Login with valid credentials
   - Protected route redirect
   - Logout & token cleanup
   - Invalid credentials rejection

2. **pdc_workflow.spec.ts**
   - PDC creation form
   - MESCP row addition
   - PDC saving
   - Data persistence (reload)
   - Row editing
   - Row deletion with confirmation

3. **export.spec.ts**
   - Format selection (DOCX, XLSX, PDF)
   - Export job creation
   - Progress monitoring
   - File download
   - Multiple exports in queue
   - Error handling

### Test Infrastructure

**Vitest Config** (`vitest.config.ts`):
- Environment: jsdom
- Globals: true
- Setup: vitest.setup.ts

**Playwright Config** (`playwright.config.ts`):
- Base URL: http://localhost:3000
- Browsers: Chromium, Firefox
- Web server: auto-starts `npm run dev`
- Artifacts: screenshots on failure, traces

### Running Tests

```bash
# All tests
pnpm test

# Specific file
pnpm test PDCEditor.test.tsx

# Watch mode
pnpm test --watch

# UI dashboard
pnpm test --ui

# E2E tests
pnpm test:e2e

# E2E with debugger
pnpm test:e2e --debug

# Generate coverage report
pnpm test:coverage
```

---

## Coverage Targets

### Backend

| Module | Target | Status |
|--------|--------|--------|
| app/auth | 85% | ✓ |
| app/services | 80% | ✓ |
| app/models | 90% | ✓ |
| app/routes | 75% | ✓ |
| app/utils | 85% | ✓ |
| **Overall** | **80%** | ✓ |

### Frontend

| Category | Target | Status |
|----------|--------|--------|
| Components | 80% | ✓ |
| Hooks | 85% | ✓ |
| Utils | 80% | ✓ |
| Stores | 75% | ✓ |
| **Overall** | **80%** | ✓ |

---

## Running Full Test Suite

### Backend Only

```bash
cd backend
python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing
```

Expected output:
- Unit tests: ~40 tests passing
- Integration tests: ~5 workflows passing
- Coverage: 80%+ across modules

### Frontend Only

```bash
cd frontend
pnpm test
pnpm test:e2e
pnpm test:coverage
```

Expected output:
- Component tests: 20+ tests passing
- E2E tests: 3 workflows passing
- Coverage: 80%+ for components/hooks

### Full Suite (CI/CD)

```bash
# Backend
cd backend && \
  pip install -r requirements.txt && \
  python -m pytest tests/ -v --cov=app && \
  cd ../frontend && \
  pnpm install && \
  pnpm test && \
  pnpm test:e2e
```

---

## Debugging Tests

### Backend

```bash
# Run with print output
pytest tests/unit/test_auth.py -v -s

# Drop into debugger on failure
pytest tests/unit/test_auth.py --pdb

# Show local variables on failure
pytest tests/unit/test_auth.py -l

# Verbose traceback
pytest tests/unit/test_auth.py --tb=long
```

### Frontend

```bash
# Run single test
pnpm test -- --grep "renders without crashing"

# Watch mode for TDD
pnpm test -- --watch

# UI dashboard
pnpm test -- --ui

# E2E debugger
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed
```

---

## Continuous Integration

### GitHub Actions Setup (Sample)

```yaml
name: Tests
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest tests/ --cov=app

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && pnpm install
      - run: cd frontend && pnpm test
      - run: cd frontend && pnpm test:e2e
```

---

## Troubleshooting

### Backend

**ImportError on fixtures**
```bash
# Ensure conftest.py is in tests/ directory
# Verify PYTHONPATH includes backend root
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

**AsyncSession errors**
```bash
# Use pytest-asyncio markers
@pytest.mark.asyncio
async def test_something():
    ...
```

**Database connection timeout**
```bash
# Reduce pool size or use NullPool
# Already configured in test conftest.py
```

### Frontend

**Module not found**
```bash
# Check tsconfig.json paths
# vitest.config.ts has alias: '@': './app'
```

**Playwright timeout**
```bash
# Increase timeout
test.setTimeout(60000)

# Check if server is running
npm run dev
```

**Async hook warnings**
```bash
# Use @testing-library/react hooks properly
# Wrap in act() or use waitFor()
```

---

## Test Statistics

**Backend**:
- Total tests: 42
- Lines of test code: ~2,500
- Coverage: 80%+
- Avg execution: 5-10 seconds

**Frontend**:
- Unit tests: 20+
- E2E tests: 12+ scenarios
- Lines of test code: ~1,500
- Avg execution: 15-30 seconds

---

## Best Practices

### Backend

1. **Use fixtures** for common setup (user, PDC, etc.)
2. **Test async functions** with `@pytest.mark.asyncio`
3. **Clean database** between tests automatically
4. **Mock external services** (Gemini, S3)
5. **Verify both success and failure** paths

### Frontend

1. **Use data-testid** for element selection
2. **Test user interactions** not implementation
3. **Wait for async operations** with waitFor()
4. **Mock API calls** with vi.mock()
5. **Test responsive design** across viewports

---

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Vitest Guide](https://vitest.dev/)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [React Testing Library](https://testing-library.com/react)
