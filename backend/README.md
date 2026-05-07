# PRIA v7 Backend — FastAPI

Production-grade FastAPI backend for PRIA v7 curriculum planning system.

**Stack:** FastAPI, SQLAlchemy ORM, PostgreSQL, Redis, Alembic migrations, Pydantic validation

---

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env.local
cp ../.env.example .env.local

# Edit .env.local with your values
# - DATABASE_URL: postgresql://user:password@localhost:5432/pria_v7
# - SECRET_KEY: (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - GEMINI_API_KEY: (from Google Cloud)
# - REDIS_URL: redis://localhost:6379/0

# Run migrations
python -m alembic upgrade head

# Start server
python -m uvicorn app.main:app --reload --port 8000
```

Server runs at: **http://localhost:8000**
- API Documentation: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- Health: http://localhost:8000/api/health/live

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app setup, middleware, routes
│   ├── database.py             # SQLAlchemy session, connection pooling
│   │
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── user.py             # User, Role
│   │   ├── pdc.py              # PDC, MESCP, Objetivo
│   │   ├── weekly_plan.py       # WeeklyPlan, Momentos
│   │   ├── accessibility_profile.py  # AccessibilityProfile
│   │   ├── adaptaciones.py      # Adaptaciones
│   │   ├── inteligencias.py     # InteligenciasMultiples
│   │   ├── productos.py         # Productos
│   │   ├── export_job.py        # ExportJob (DOCX, XLSX, PDF)
│   │   └── microobjetivo.py     # MicroObjetivo, Indicador
│   │
│   ├── schemas/                # Pydantic schemas (request/response)
│   │   ├── user.py             # UserCreate, UserUpdate, UserResponse
│   │   ├── pdc.py              # PDCCreate, PDCResponse, MESCPSchema
│   │   ├── planning.py         # WeeklyPlanSchema, MomentosSchema
│   │   └── export.py           # ExportJobSchema
│   │
│   ├── services/               # Business logic
│   │   ├── pdc_service.py       # PDC CRUD, MESCP operations
│   │   ├── gemini_service.py    # AI prompts, adaptation generation
│   │   ├── cache_service.py     # Redis caching
│   │   ├── planning_service.py  # Weekly plan generation
│   │   ├── motor_m1a_service.py # 45-min lesson logic
│   │   ├── import_service.py    # DOCX parsing
│   │   └── export_service.py    # DOCX/XLSX/PDF generation
│   │
│   ├── auth/                   # Authentication & Authorization
│   │   ├── routes.py           # /api/auth/* endpoints
│   │   └── utils.py            # Password hashing, JWT tokens
│   │
│   ├── routes/                 # API route handlers
│   │   ├── pdc.py              # GET/POST /api/pdc/*
│   │   ├── planning.py         # GET/POST /api/planning/*
│   │   ├── accessibility.py    # GET/POST /api/accessibility/*
│   │   ├── export.py           # GET/POST /api/export/*
│   │   └── health.py           # GET /api/health/*
│   │
│   ├── utils/                  # Utilities
│   │   ├── validators.py       # Input validation
│   │   └── constants.py        # App constants
│   │
│   └── tasks/
│       └── celery_config.py    # Async task queue (optional)
│
├── alembic/                    # Database migrations
│   ├── env.py                  # Migration environment
│   ├── script.py.mako          # Migration template
│   └── versions/               # Migration files
│       ├── 0001_initial.py
│       ├── 0002_pdc_extensions.py
│       ├── 0003_planning_extensions.py
│       ├── 0004_accessibility_profiles.py
│       └── 0005_export_and_branding.py
│
├── tests/                      # Unit & integration tests
│   ├── conftest.py             # Pytest fixtures
│   ├── test_auth.py
│   ├── test_pdc.py
│   ├── test_planning.py
│   └── test_export.py
│
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Multi-stage build
├── alembic.ini                 # Alembic configuration
├── README.md                   # This file
└── .env.example                # Environment template
```

---

## Key Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login (returns access token)
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/auth/me` — Get current user profile

### PDC (Curriculum Design)
- `GET /api/pdc/` — List all PDCs
- `POST /api/pdc/` — Create new PDC
- `GET /api/pdc/{pdc_id}` — Get PDC details
- `PUT /api/pdc/{pdc_id}` — Update PDC
- `DELETE /api/pdc/{pdc_id}` — Delete PDC

### MESCP (Learning Objectives)
- `GET /api/pdc/{pdc_id}/mescp` — List MESCP rows
- `POST /api/pdc/{pdc_id}/mescp` — Add MESCP row
- `PUT /api/pdc/{pdc_id}/mescp/{mescp_id}` — Update MESCP
- `DELETE /api/pdc/{pdc_id}/mescp/{mescp_id}` — Delete MESCP

### Planning (Weekly Plans)
- `GET /api/planning/{pdc_id}/weeks` — Get 16 weekly plans
- `POST /api/planning/{pdc_id}/weeks/generate` — Auto-generate from PDC
- `PUT /api/planning/{pdc_id}/week/{week_num}` — Update week
- `POST /api/planning/{pdc_id}/week/{week_num}/copy` — Copy week

### Accessibility
- `GET /api/accessibility/profiles` — List profiles (Dislexia, ADHD, TEA, Dyscalculia)
- `GET /api/accessibility/adaptations/{pdc_id}` — Get adaptations for PDC
- `POST /api/accessibility/adapt` — Generate adaptations via Gemini

### Export
- `POST /api/export/docx` — Generate DOCX with logo
- `POST /api/export/xlsx` — Generate XLSX with formulas
- `POST /api/export/pdf` — Generate PDF
- `POST /api/export/batch` — Batch export ZIP
- `GET /api/export/jobs` — List export jobs

### Health
- `GET /api/health/live` — Liveness probe (is running?)
- `GET /api/health/ready` — Readiness probe (ready for requests?)

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pria_v7
# For development: sqlite:///./test.db

# JWT
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30

# AI (Gemini)
GEMINI_API_KEY=your-api-key
GOOGLE_MODEL=gemini-2.0-flash

# Cache
REDIS_URL=redis://localhost:6379/0

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Optional: Email (future)
# SMTP_SERVER=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
```

---

## Development Commands

### Run Server

```bash
# Development (with auto-reload)
python -m uvicorn app.main:app --reload --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Testing

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ -v --cov=app --cov-report=html

# Run specific test
python -m pytest tests/test_pdc.py::test_create_pdc -v

# Run tests matching pattern
python -m pytest tests/ -k "auth" -v
```

### Database Migrations

```bash
# Create migration
python -m alembic revision --autogenerate -m "description"

# Apply migrations
python -m alembic upgrade head

# Rollback one migration
python -m alembic downgrade -1

# Check current version
python -m alembic current

# View migration history
python -m alembic history
```

### Code Quality

```bash
# Type checking
python -m mypy app --ignore-missing-imports

# Linting
pylint app/

# Format code
black app/

# Sort imports
isort app/
```

---

## Architecture Decisions

### AsyncSession
- All database operations use `AsyncSession` for non-blocking I/O
- See `database.py` for session factory configuration

### Service Layer
- Business logic isolated in `services/` module
- Controllers (routes) stay thin and testable
- Easy to mock dependencies in tests

### Schemas
- Pydantic schemas enforce request/response structure
- Separate from models for flexibility
- Type hints for IDE autocomplete

### Error Handling
- Standard HTTP status codes (200, 201, 400, 401, 404, 500)
- JSON error responses with `{"detail": "error message"}`
- Logging for debugging

### Authentication
- JWT tokens (HS256 algorithm)
- 15-minute access tokens
- 30-day refresh tokens
- Password hashing with bcrypt (via passlib)

### Caching
- Redis for frequently accessed data (PDCs, profiles)
- Cache invalidation on write
- 1-hour default TTL

---

## Testing Strategy

### Unit Tests
- Test individual functions in isolation
- Mock external dependencies (database, Redis, Gemini)
- Fast execution (<1s per test)

### Integration Tests
- Test service layer with real database
- Use test database (SQLite or PostgreSQL)
- Clean up after each test (fixtures)

### Coverage Target
- Minimum 80% code coverage
- All critical paths covered
- Auth, PDC, export routes fully tested

---

## Performance Tips

1. **Database Indexing** — Add indexes to frequently queried columns:
   ```sql
   CREATE INDEX idx_pdc_user_id ON pdc(user_id);
   CREATE INDEX idx_mescp_pdc_id ON mescp(pdc_id);
   ```

2. **N+1 Query Prevention** — Use SQLAlchemy `selectinload`:
   ```python
   pdc = await session.execute(
       select(PDC).options(selectinload(PDC.mescp))
   )
   ```

3. **Redis Caching** — Cache PDC + MESCP together:
   ```python
   cache_key = f"pdc:{pdc_id}:full"
   ```

4. **Connection Pooling** — SQLAlchemy defaults to pool_size=5, max_overflow=10
   - Tune for production load in `database.py`

5. **Pagination** — Limit list endpoints:
   ```python
   GET /api/pdc/?skip=0&limit=20
   ```

---

## Deployment

### Docker

```bash
# Build image
docker build -f Dockerfile -t pria-v7-backend:latest .

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e GEMINI_API_KEY="..." \
  pria-v7-backend:latest
```

### Railway

```bash
# Deploy
railway up --service backend

# Logs
railway logs --service backend -f

# Run command
railway exec python -m alembic upgrade head
```

### Migrations Before Startup

Always run migrations before serving requests:

```bash
# In Dockerfile or startup script
python -m alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Troubleshooting

### Database Connection Error

```bash
# Check connection string
echo $DATABASE_URL

# Test with psql
psql $DATABASE_URL

# Verify PostgreSQL is running
docker ps | grep postgres
```

### Port Already in Use

```bash
# Windows: Find process on port 8000
Get-NetTCPConnection -LocalPort 8000

# Kill process
Stop-Process -Id <PID> -Force

# Linux/Mac: Kill process on port 8000
lsof -i :8000 | awk 'NR!=1 {print $2}' | xargs kill -9
```

### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Clear Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete
```

### Gemini API Not Responding

```bash
# Check API key
echo $GEMINI_API_KEY

# Test API directly
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
```

---

## Security Considerations

1. **Never commit .env files** — Use .env.example instead
2. **Rotate SECRET_KEY regularly** — Old tokens become invalid
3. **Use HTTPS in production** — Railway/Vercel handles this
4. **SQL Injection Prevention** — SQLAlchemy ORM prevents this by default
5. **CORS Configuration** — Only allow trusted origins
6. **Rate Limiting** (future) — Add slowapi for API rate limiting
7. **API Key Management** — Rotate GEMINI_API_KEY quarterly

---

## Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test: `pytest tests/ -v`
3. Ensure coverage ≥80%
4. Commit with conventional commit format: `feat(pdc): add new MESCP endpoint`
5. Push and create pull request

---

## License

Proprietary — Las Palmas School 2026

---

## Contact

For questions or issues:
- Email: dev@laspalmasa.edu.bo
- Slack: #pria-v7-dev
- Jira: https://jira.laspalmasa.edu.bo

---

**Last Updated:** 2026-05-07
**Maintained by:** PRIA v7 Backend Team
