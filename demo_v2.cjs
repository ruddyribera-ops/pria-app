const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';
const OUT_DIR = 'D:/Temp/opencode/verify_v6';

async function login() {
    const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', contrasena: 'admin123' })
    });
    return (await resp.json()).data;
}

async function main() {
    const { token, user } = await login();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    
    await page.goto(BASE_URL + '/login');
    await page.evaluate(([t, u]) => {
        localStorage.setItem('pria_token', t);
        localStorage.setItem('pria_user', JSON.stringify(u));
        localStorage.setItem('pria_teacher_config', JSON.stringify({
            nombre: 'Misterruddy', email: 'Misterruddy@laspalmas.edu.bo', escuela: 'Unidad Educativa Las Palmas'
        }));
    }, [token, user]);
    
    await page.goto(BASE_URL + '/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("Texto de lenguaje")');
    await page.waitForFunction(() => document.body.textContent.includes('Selecciona los temas'), { timeout: 10000 });
    const checkboxes = await page.$$('input[type="checkbox"]');
    await checkboxes[0].click();
    await page.waitForTimeout(200);
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(2000);
    
    const deliverables = [
        { label: 'Diapositivas', desc: '10-12 diapositivas para tu clase', name: 'Diapositivas' },
        { label: 'Plan Clase', desc: 'Actividades minuto a minuto', name: 'Plan_Clase' },
        { label: 'Quiz', desc: '5 preguntas para evaluar', name: 'Quiz' },
    ];
    
    for (const deliv of deliverables) {
        console.log(`\n[${deliv.label}]`);
        
        // Click Generar using specific selector for the card with this description
        const genBtn = await page.evaluateHandle((desc) => {
            const cards = Array.from(document.querySelectorAll('div'));
            for (const card of cards) {
                const text = card.textContent || '';
                if (text.includes(desc) && card.querySelectorAll('button').length === 1) {
                    const btn = card.querySelector('button');
                    if (btn && btn.textContent.trim() === 'Generar') return btn;
                }
            }
            return null;
        }, deliv.desc);
        
        const btn = genBtn.asElement();
        if (!btn) {
            console.log('  Already generated or button not found');
        } else {
            await btn.click();
            console.log('  Generating...');
            
            // Wait for completion (Regenerar appears)
            for (let i = 0; i < 24; i++) {
                await page.waitForTimeout(5000);
                const done = await page.evaluate((desc) => {
                    const cards = Array.from(document.querySelectorAll('div'));
                    for (const card of cards) {
                        const text = card.textContent || '';
                        if (text.includes(desc) && text.includes('Regenerar') && text.includes('PPTX')) {
                            const btns = card.querySelectorAll('button');
                            if (btns.length === 4) return true;
                        }
                    }
                    return false;
                }, deliv.desc);
                if (done) {
                    console.log('  Completed');
                    break;
                }
            }
        }
        
        // Download PPTX using SPECIFIC card selector
        const downloadSuccess = await page.evaluate((args) => {
            const { desc } = args;
            const cards = Array.from(document.querySelectorAll('div'));
            for (const card of cards) {
                const text = card.textContent || '';
                // Find the SPECIFIC card by description AND has Regenerar (means completed)
                if (text.includes(desc) && text.includes('Regenerar')) {
                    // Check this is the right card by counting buttons
                    const btns = card.querySelectorAll('button');
                    if (btns.length === 4) {
                        const pptxBtn = Array.from(btns).find(b => b.textContent.includes('PPTX'));
                        if (pptxBtn) {
                            pptxBtn.click();
                            return true;
                        }
                    }
                }
            }
            return false;
        }, { desc: deliv.desc });
        
        if (downloadSuccess) {
            try {
                const dl = await page.waitForEvent('download', { timeout: 20000 });
                const path = `${OUT_DIR}/PRIA_${deliv.name}.pptx`;
                await dl.saveAs(path);
                console.log('  Saved:', path.split('/').pop());
            } catch (e) {
                console.log('  Download timeout');
            }
        } else {
            console.log('  No PPTX button found in card');
        }
    }
    
    await browser.close();
    
    console.log('\n=== FILES ===');
    fs.readdirSync(OUT_DIR).filter(f => f.startsWith('PRIA_') && f.endsWith('.pptx')).forEach(f => {
        const s = fs.statSync(`${OUT_DIR}/${f}`);
        console.log(`${f}: ${s.size} bytes`);
    });
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
