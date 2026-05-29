# Sprint 2: Real Textbook Pipeline â€” Completion Report
## Date: 2026-05-27 | Agent: M2.7

## Accomplished
- [x] Task 2a: Fixed `uploadMaterial` â€” removed FormData, sends JSON `{ filename, tipo, size }`
- [x] Task 2b: Added `onProgress` callback to `ingestDocument`, propagated to `ingestPdf` + `ingestImage`
- [x] Task 2c: Added MAX_PDF_PAGES=50 limit in `ingestPdf` with warning
- [x] Task 2d: OCR warnings displayed in MaterialesPage after ingestion

## Files Modified
- `src/api/materials.ts` â€” `uploadMaterial` now sends JSON metadata (not FormData)
- `src/lib/ingest/documentIngester.ts` â€” `ingestDocument`, `ingestPdf`, `ingestImage` accept `onProgress` callback; MAX_PDF_PAGES=50 limit; Tesseract logger wired to progress
- `src/pages/MaterialesPage.tsx` â€” `ocrProgress` state, progress bar UI, warnings display, state resets on new upload

## Verification
- [x] npm run build: 0 errors
- [x] npm run typecheck: 0 errors
- [x] npx vitest run: 27/27 passing

## Edge Cases Found
- MaterialesPage.tsx had `as any` casts for showToast in useMotorGenerator â€” this is pre-existing (Sprint 4 fixes at source)
- The `ingestWarnings` state was not being reset on new upload â€” fixed by adding `setIngestWarnings([])` at upload start
- Python heredoc strings in triple quotes (`'''`) fail JSON parsing in bash calls â€” use edit tool for surgical replacements instead

## Lessons
- TypeScript `as` casts in MaterialesPage are widespread â€” Sprint 4 fixes the root cause (useMotorGenerator type signature)
- Small surgical edits via edit tool are safer than Python script replacements for production code

## Last Completed
- 2026-05-27 - Real textbook pipeline: JSON upload, progress bar, 50-page limit, warnings display

