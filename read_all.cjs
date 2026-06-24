const JSZip = require('jszip');
const fs = require('fs');

async function getAllSlideText(filePath) {
    const buf = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files).filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/)).sort();
    const allTexts = [];
    for (const s of slides) {
        const xml = await zip.files[s].async('text');
        const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
        allTexts.push(texts.join(' | '));
    }
    return allTexts;
}

async function main() {
    const base = 'D:/Temp/opencode/verify_v6';
    
    for (const f of ['PRIA_Diapositivas', 'PRIA_Plan_Clase', 'PRIA_Quiz']) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`=== ${f} ===`);
        console.log('='.repeat(60));
        const slides = await getAllSlideText(`${base}/${f}.pptx`);
        slides.forEach((t, i) => console.log(`Slide ${i+1}: ${t.slice(0, 250)}`));
    }
}

main().catch(console.error);
