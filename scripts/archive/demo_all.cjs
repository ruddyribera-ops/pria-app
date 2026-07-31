const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';
const OUT_DIR = 'D:/Temp/opencode/verify_v6';

async function loginApi() {
    const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', contrasena: 'admin123' })
    });
    return (await resp.json()).data;
}

// Find the card by its specific description and return the button to click
async function findCardButton(page, description, buttonText) {
    return await page.evaluateHandle(({ desc, btnText }) => {
        const cards = Array.from(document.querySelectorAll('div'));
        for (const card of cards) {
            const text = card.textContent || '';
            if (text.includes(desc) && card.querySelectorAll('button').length >= 1) {
                // Find the matching button
                const btns = card.querySelectorAll('button');
                for (const b of btns) {
                    if (b.textContent.trim() === btnText) return b;
                }
            }
        }
        return null;
    }, { desc: description, btnText: buttonText });
}

async function waitForCardComplete(page, description) {
    for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(5000);
        const done = await page.evaluate((desc) => {
            const cards = Array.from(document.querySelectorAll('div'));
            for (const card of cards) {
                const text = card.textContent || '';
                if (text.includes(desc) && (text.includes('Regenerar') || text.includes('Descargar') || text.includes('PPTX'))) {
                    // Card has either completed (Regenerar+PPTX) or already has downloads
                    return true;
                }
            }
            return false;
        }, description);
        if (done) return true;
    }
    return false;
}

async function downloadFromCard(page, description, format, outputName) {
    return await page.evaluate((args) => {
        const { desc, fmt } = args;
        // Find the SPECIFIC card by description (must be tight - 1-2 buttons for uncompleted or 4 for completed)
        // We need to find the SMALLEST div that contains the description text and a button matching the format
        const allDivs = Array.from(document.querySelectorAll('div'));
        for (const div of allDivs) {
            // Skip if this div also contains "Plan de unidad" (Síntesis card sibling)
            const text = div.textContent || '';
            // Check if this is the SPECIFIC card (has description, has buttons, doesn't have unrelated content)
            if (text.includes(desc) && !text.includes('Plan de unidad') && !text.includes('Sintesis curricular completa')) {
                const btns = div.querySelectorAll('button');
                const formatBtn = Array.from(btns).find(b => b.textContent.includes(fmt));
                if (formatBtn) {
                    // Make sure this isn't a parent that contains multiple cards
                    // Check the button is in a leaf or near-leaf position
                    formatBtn.click();
                    return true;
                }
            }
        }
        return false;
    }, { desc: description, fmt: format, name: outputName });
}

async function main() {
    console.log('PRIA Demo - All Topic-Level Deliverables\n');

    const { token, user } = await loginApi();
    console.log('Logged in');

    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    // Set localStorage
    await page.goto(BASE_URL + '/login');
    await page.evaluate(([t, u]) => {
        localStorage.setItem('pria_token', t);
        localStorage.setItem('pria_user', JSON.stringify(u));
        localStorage.setItem('pria_teacher_config', JSON.stringify({
            nombre: 'Misterruddy',
            email: 'Misterruddy@laspalmas.edu.bo',
            escuela: 'Unidad Educativa Las Palmas'
        }));
    }, [token, user]);

    await page.goto(BASE_URL + '/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 1: Select textbook
    console.log('[1] Selecting textbook...');
    await page.click('button:has-text("Texto de lenguaje")');
    await page.waitForFunction(() => document.body.textContent.includes('Selecciona los temas'), { timeout: 10000 });
    console.log('  OK - on step 2');

    // Step 2: Select FIRST topic only (one deck per topic architecture)
    console.log('[2] Selecting 1 topic...');
    const checkboxes = await page.$$('input[type="checkbox"]');
    await checkboxes[0].click();
    await page.waitForTimeout(200);
    console.log('  OK - selected topic 0');
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(2000);
    console.log('  OK - on step 3\n');

    // Define the deliverables to generate (skip ABP)
    const deliverables = [
        { key: 'slides', desc: '10-12 diapositivas para tu clase', name: 'Diapositivas', label: 'Diapositivas' },
        { key: 'plan', desc: 'Actividades minuto a minuto', name: 'Plan_Clase', label: 'Plan de clase' },
        { key: 'quiz', desc: '5 preguntas para evaluar', name: 'Quiz', label: 'Quiz' },
    ];

    const formats = ['PPTX', 'PDF', 'DOCX'];

    for (const deliv of deliverables) {
        console.log(`[${deliv.label}] Generating...`);

        // Find and click Generar
        const genBtn = await page.evaluateHandle(({ desc, btnText }) => {
            const cards = Array.from(document.querySelectorAll('div'));
            for (const card of cards) {
                const text = card.textContent || '';
                if (text.includes(desc) && card.querySelectorAll('button').length >= 1) {
                    const btns = card.querySelectorAll('button');
                    for (const b of btns) {
                        if (b.textContent.trim() === btnText) return b;
                    }
                }
            }
            return null;
        }, { desc: deliv.desc, btnText: 'Generar' });
        
        const btnElement = genBtn.asElement();
        if (!btnElement) {
            console.log(`  ERROR: ${deliv.label} Generar button not found`);
            continue;
        }
        await btnElement.click();
        console.log('  Generating...');

        // Wait for completion
        const completed = await waitForCardComplete(page, deliv.desc);
        if (completed) {
            console.log('  ✓ Completed');

            // Download each format
            for (const fmt of formats) {
                try {
                    const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
                    const clicked = await downloadFromCard(page, deliv.desc, fmt, deliv.name);
                    if (clicked) {
                        const dl = await downloadPromise;
                        if (dl) {
                            const ext = fmt === 'PPTX' ? 'pptx' : fmt.toLowerCase();
                            const path = `${OUT_DIR}/PRIA_${deliv.name}.${ext}`;
                            await dl.saveAs(path);
                            console.log(`  ✓ Saved ${path.split('/').pop()}`);
                        }
                    }
                } catch (e) {
                    console.log(`  Download ${fmt} error:`, e.message.slice(0, 50));
                }
            }
        } else {
            console.log('  TIMEOUT');
        }
        console.log('');
    }

    await page.screenshot({ path: `${OUT_DIR}/all_deliverables.png`, fullPage: true });
    await browser.close();

    // List all generated files
    console.log('\n=== ALL DELIVERABLES ===');
    fs.readdirSync(OUT_DIR).filter(f => f.startsWith('PRIA_')).sort().forEach(f => {
        const s = fs.statSync(`${OUT_DIR}/${f}`);
        console.log(`${f}: ${s.size} bytes`);
    });

    console.log('\nDone!');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
