/**
 * PRIA v10 — Focused E2E: BUG-005 critical verification (slides PPTX teacher name)
 *
 * Scope: ONE test. Verify the slides motor for the wizard-generated content
 * produces a PPTX that contains the teacher's name and school. This is the
 * regression target for BUG-005.
 *
 * Why focused: prior full-flow run failed because the spec expected
 * `Texto de lenguaje.pdf` which doesn't exist in m.gonzalez's seeded account;
 * only test fixtures exist. Also the seeded materials have no units extracted.
 * This spec pre-seeds units on a chosen material via the API, picks the
 * specific material that has been enriched, then drives the wizard.
 *
 * FM-1 alternative considered: call the LLM motor API directly with curl
 * and assert teacher/school in the response. Rejected — would test the API
 * but not the actual user-visible flow.
 */

import { test, expect, type Page, request as pwRequest } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
// @ts-ignore - JSZip types ship inconsistently
import JSZip from 'jszip';

const TEACHER_USER = 'm.gonzalez';
const TEACHER_PASS = 'docente123';
const TEACHER_NAME = 'Prof. María González';
const TEACHER_SCHOOL = 'Unidad Educativa San Andrés';
const TARGET_TOPIC = 'Guede pinta los animales';
const TARGET_UNIT = 'Mitos y leyendas';
const TARGET_MATERIAL_FILENAME = 'Unidad 3 - Lenguaje_5to_SB.pdf';
const TEST_DOWNLOAD_DIR = path.resolve('D:\\Temp\\opencode\\user_test\\downloads');

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="text"], input[name="usuario"]').first().fill(TEACHER_USER);
  await page.locator('input[type="password"]').first().fill(TEACHER_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function verifyPptxHasTeacher(filePath: string): Promise<{
  hasTeacherFull: boolean;     // "Prof. María González"
  hasTeacherName: boolean;     // "María González" (DB-side, without prefix)
  hasSchool: boolean;
  hasTopic: boolean;
  size: number;
  slide1Snippet: string;
}> {
  const buf = fs.readFileSync(filePath);
  const zip: any = await JSZip.loadAsync(buf);
  let raw = '';
  let slide1Snippet = '';
  const targets = ['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml', 'ppt/slides/slide3.xml', 'ppt/presentation.xml'];
  for (const name of targets) {
    const entry = zip.file(name);
    if (!entry) continue;
    let xml: string;
    try {
      xml = String(await entry.async('string'));
    } catch {
      const ab = await entry.async('arraybuffer');
      xml = Buffer.from(ab as ArrayBuffer).toString('utf-8');
    }
    raw += xml;
    if (name === 'ppt/slides/slide1.xml' && !slide1Snippet) slide1Snippet = xml.slice(0, 400);
  }
  const norm: string = normalize(raw);
  return {
    hasTeacherFull: norm.includes(normalize(TEACHER_NAME)),
    hasTeacherName: norm.includes(normalize('María González')),
    hasSchool: norm.includes(normalize(TEACHER_SCHOOL)),
    hasTopic: norm.includes(normalize(TARGET_TOPIC)),
    size: fs.statSync(filePath).size,
    slide1Snippet,
  };
}

test.describe('BUG-005 critical verification', () => {
  test.setTimeout(420000);

  test('Slides PPTX for wizard-generated content contains teacher name', async ({ page, baseURL }) => {
    fs.mkdirSync(TEST_DOWNLOAD_DIR, { recursive: true });

    // ── Pre-seed: log in via API, find or pick a material, PUT units_json ─────
    const api = await pwRequest.newContext({ baseURL: baseURL ?? 'http://localhost:8080' });
    const loginRes = await api.post('/api/auth/login', { data: { username: TEACHER_USER, password: TEACHER_PASS } });
    expect(loginRes.ok(), `login API failed: ${loginRes.status()}`).toBe(true);
    const token = (await loginRes.json()).data.token as string;

    const matsRes = await api.get('/api/materials/', { headers: { Authorization: `Bearer ${token}` } });
    expect(matsRes.ok()).toBe(true);
    const mats = (await matsRes.json()).data as Array<{ id: number; filename: string; units_json?: string | null }>;

    let pickedId: number | null = null;
    // Prefer a material whose filename contains the seeded name
    for (const m of mats) {
      if (m.filename === TARGET_MATERIAL_FILENAME) { pickedId = m.id; break; }
    }
    // Fall back to the first material that's > 50 KB (i.e. has real PDF content)
    if (pickedId === null) {
      const candidate = mats.find((m) => (m as any).size && (m as any).size > 50_000);
      if (candidate) pickedId = candidate.id;
    }
    if (pickedId === null) throw new Error('No suitable material found to seed units');

    const unitsPayload = {
      units: [
        {
          id: 'u-bug005-1',
          number: 1,
          nombre: TARGET_UNIT,
          titulo: TARGET_UNIT,
          name: TARGET_UNIT,
          topics: [
            { id: 't-bug005-1', topicName: TARGET_TOPIC, topicType: 'lectura' },
          ],
        },
      ],
    };
    const putRes = await api.put(`/api/materials/${pickedId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: unitsPayload,
    });
    expect(putRes.ok(), `seed units PUT failed: ${putRes.status()}`).toBe(true);
    console.log(`[SPEC] Seeded units on material id=${pickedId} (${TARGET_TOPIC})`);
    await api.dispose();

    // ── UI: login and walk the wizard for the chosen material ─────────────────
    await login(page);
    await page.goto('/wizard');

    // Click the specific material (not just first .pdf)
    const materialBtn = page.locator(`button:has-text("${TARGET_MATERIAL_FILENAME}")`).first();
    await expect(materialBtn).toBeVisible({ timeout: 30_000 });
    const materialName = await materialBtn.textContent();
    console.log(`[SPEC] Picked material: ${materialName?.trim()}`);
    await materialBtn.click();

    // Wait for the unit tree to render. First unit is auto-expanded (UnitTopicSelector
    // initialises expandedUnits with the first 2 unit ids). Topic is a <label>
    // with an <input type="checkbox"> inside, labelled by the topic name text.
    const topicLabel = page.locator(`label:has-text("${TARGET_TOPIC}")`).first();
    await expect(topicLabel).toBeVisible({ timeout: 60_000 });
    console.log(`[SPEC] Topic label visible: ${TARGET_TOPIC}`);
    // Click the checkbox inside the label (it's a checkbox-style selector)
    await topicLabel.locator('input[type="checkbox"]').first().check();

    // Footer should now show "1 tema seleccionado"
    await expect(page.locator(`text=/1 tema seleccionado/i`)).toBeVisible({ timeout: 15_000 });

    // Click "Continuar con 1 tema →" (the UnitTopicSelector's own "Generar N temas"
    // button is wired to a no-op in WizardPage; the actual advance is this Continue
    // button in the SelectStep footer.)
    await page.locator(`button:has-text("Continuar con")`).first().click();

    // Generate the slides motor card
    const card = page.locator('div:has(> div > h3:text("Diapositivas"))').first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.locator('button:has-text("Generar")').first().click();

    // Wait for completion (Regenerar button appears = done state)
    await card.locator('button:has-text("Regenerar")').waitFor({ state: 'visible', timeout: 240_000 });
    console.log('[SPEC] Slides motor completed');

    // Download PPTX
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      card.locator('button:has-text("PPTX")').first().click(),
    ]);
    const stamp = Date.now();
    const pptxPath = path.join(TEST_DOWNLOAD_DIR, `critical_bug005_${stamp}.pptx`);
    await download.saveAs(pptxPath);

    const result = await verifyPptxHasTeacher(pptxPath);
    console.log(`[BUG-005] File: ${pptxPath}`);
    console.log(`[BUG-005] Size: ${result.size} bytes`);
    console.log(`[BUG-005] Topic "${TARGET_TOPIC}" found: ${result.hasTopic}`);
    console.log(`[BUG-005] Teacher name "${TEACHER_NAME}" (with Prof. prefix) found: ${result.hasTeacherFull}`);
    console.log(`[BUG-005] Teacher name "María González" (raw) found: ${result.hasTeacherName}`);
    console.log(`[BUG-005] School name "${TEACHER_SCHOOL}" found: ${result.hasSchool}`);
    console.log(`[BUG-005] Slide1 XML head: ${result.slide1Snippet}`);

    expect(result.size).toBeGreaterThan(5_000);
    expect.soft(result.hasTeacherName, 'BUG-005: teacher name (raw) missing from slides PPTX').toBe(true);
    expect.soft(result.hasSchool, 'BUG-005 FAIL: school name missing from slides PPTX').toBe(true);
  });
});
