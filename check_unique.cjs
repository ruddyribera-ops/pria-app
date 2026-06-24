const JSZip = require('jszip');
const fs = require('fs');

async function checkPptx(filePath, label) {
    try {
        const buf = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buf);
        const slideFile = 'ppt/slides/slide1.xml';
        if (zip.files[slideFile]) {
            const xml = await zip.files[slideFile].async('text');
            const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
            console.log(`${label}:`, texts.slice(0, 4).join(' | '));
        }
    } catch (e) {
        console.log(`${label}: ERROR -`, e.message);
    }
}

async function main() {
    const base = 'D:/Temp/opencode/verify_v6';
    console.log('=== PPTX COVER TITLES ===');
    await checkPptx(`${base}/PRIA_Diapositivas.pptx`, 'Diapositivas');
    await checkPptx(`${base}/PRIA_Plan_Clase.pptx`, 'Plan Clase');
    await checkPptx(`${base}/PRIA_Quiz.pptx`, 'Quiz');
    
    console.log('\n=== PPTX HASHES (should differ) ===');
    const files = ['PRIA_Diapositivas.pptx', 'PRIA_Plan_Clase.pptx', 'PRIA_Quiz.pptx'];
    const crypto = require('crypto');
    files.forEach(f => {
        const buf = fs.readFileSync(`${base}/${f}`);
        const hash = crypto.createHash('md5').update(buf).digest('hex').slice(0, 16);
        console.log(`${f}: ${hash}`);
    });
}

main().catch(console.error);
