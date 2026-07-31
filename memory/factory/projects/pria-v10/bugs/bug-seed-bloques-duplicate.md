# Bug — seed_test_data.ts creates duplicate bloques on re-run

**Filed by:** Delivery Engineer (during Fix #4 verification)
**Date:** 2026-07-07
**Project:** pria-v10
**Severity:** low (data quality, not demo-blocking)
**Component:** `server/scripts/seed_test_data.ts`

## Reproduction

1. Run seed once: `docker exec pria-backend npx tsx /app/scripts/seed_test_data.ts` → 25 bloques inserted, count = 25
2. Run seed again → 25 MORE bloques inserted, count = 50
3. Verified via `SELECT dia, hora_inicio, count(*) FROM bloques WHERE teacher_code='PROF-MG' GROUP BY 1,2 HAVING count(*) > 1;` → 25 duplicate rows

## Expected

Running the seed multiple times is idempotent — same 25 bloques for PROF-MG, no growth in count.

## Actual

Re-running the seed doubles the bloques count. Current DB has 50 bloques (2x). The `ON CONFLICT DO NOTHING` clause is silently a no-op.

## Root cause

`server/scripts/seed_test_data.ts:103` uses `ON CONFLICT DO NOTHING` against a target table that has no unique constraint or unique index that would match the conflict target. Without `ON CONFLICT (target_cols)`, Postgres has no inferred arbiter and the clause is a no-op — every insert succeeds.

The `bloques` table has no unique index on `(teacher_code, dia, hora_inicio)`. Need to add one in a migration.

## Suggested fix

1. **Migration** (e.g. `server/migrations/012_bloques_unique_slot.sql`):
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_bloques_teacher_slot
     ON bloques(teacher_code, dia, hora_inicio);
   ```
2. **Seed script** (line 103):
   ```ts
   ON CONFLICT (teacher_code, dia, hora_inicio) DO NOTHING
   ```
3. **Cleanup**: dedupe existing 50 rows → 25 by `DELETE FROM bloques b1 USING bloques b2 WHERE b1.ctid < b2.ctid AND b1.teacher_code = b2.teacher_code AND b1.dia = b2.dia AND b1.hora_inicio = b2.hora_inicio;` (keep lowest ctid per slot).

## Impact

- Demo works (m.gonzalez login returns 200, bloques are fetchable)
- Data is "doubled" — any UI showing a list of bloques per day will show each slot twice
- Long-term: bloques count grows unbounded with each seed re-run
