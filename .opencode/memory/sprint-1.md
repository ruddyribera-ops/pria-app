# Sprint 1: Database Maturity â€” Completion Report
## Date: 2026-05-27 | Agent: M2.7

## Accomplished
- [x] Task 1a: Created migration framework (`migrate.ts` + `001_initial.sql`)
- [x] Task 1b: Replaced `initDB()` in `schema.ts` to call `runMigrations()`
- [x] Task 1c: Fixed `dbRun` return type: `lastInsertRowid` â†’ `id`
- [x] Task 1d: Updated all consumers (`auth.ts`, `materials.ts`, `curriculums.ts`)

## Files Modified
- `server/src/db/migrations/001_initial.sql` â€” new file, complete schema with FKs + TIMESTAMPTZ
- `server/src/db/migrate.ts` â€” new file, migration runner with tracking table
- `server/src/db/schema.ts` â€” replaced `initDB()` to delegate to `runMigrations()`, changed `dbRun` return `{ id, rowCount }`
- `server/src/routes/auth.ts` â€” `info.lastInsertRowid` â†’ `info.id`
- `server/src/routes/materials.ts` â€” `info.lastInsertRowid` â†’ `info.id`
- `server/src/routes/curriculums.ts` â€” `info.lastInsertRowid` â†’ `info.id`

## Verification
- [x] Server starts with fresh DB â†’ all tables created via migration âœ…
- [x] Server starts with existing DB â†’ "No pending migrations" (not re-applied) âœ…
- [x] schema_migrations table has 1 row (version=1, name=001_initial.sql) âœ…
- [x] All created_at columns are TIMESTAMP WITH TIME ZONE âœ…
- [x] 6 foreign keys exist (materialsâ†’users, curriculumsâ†’users, etc.) âœ…
- [x] FK violation on invalid user_id â†’ PostgreSQL error âœ…
- [x] DELETE user â†’ cascade deletes their materials âœ…
- [x] npm run build â†’ 0 errors âœ…
- [x] npm run typecheck â†’ 0 errors âœ…
- [x] npx vitest run â†’ 27/27 passing âœ…

## Edge Cases Found
- `dotenv.config()` in `config.ts` resolves to `server/.env` (not root `.env`). When `server/.env` has correct values but `DATABASE_URL=sqlite://./prisa.db` and the `.db` file is missing, the server fails to start. Solution: temporarily update `server/.env` for PostgreSQL testing.
- PostgreSQL startup output shows garbled UTF-8 box-drawing characters in Windows terminal â€” this is a terminal encoding issue, not a code issue.

## Lessons
- For migration testing, remember to update `server/.env` (not root `.env`) when switching between SQLite and PostgreSQL
- The `cmd /c` approach for background server processes works but the background process needs careful handling with Start-Sleep in separate commands
- Keep dbAll/dbGet/dbRun exports â€” all route files depend on them; the migration system only replaces `initDB()`

## Last Completed
- 2026-05-27 - Database migrations, FKs, TIMESTAMPTZ

