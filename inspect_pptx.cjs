const JSZip = require('jszip');
const fs = require('fs');

async function readPptx(filePath) {
    const buf = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buf);
    const slideFiles = Object.keys(zip.files).filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/));
    const allText = [];
    for (const f of slideFiles) {
        const xml = await zip.files[f].async('text');
        const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
        allText.push(...texts);
    }
    return allText.join(' ');
}

async function main() {
    const pptxPath = 'D:/Temp/opencode/verify_v6/PRIA_Sintesis.pptx';
    
    console.log('Inspecting:', pptxPath);
    const text = await readPptx(pptxPath);
    
    console.log('\n=== BUG VERIFICATION ===');
    
    // BUG-001: No "Tema de ejemplo"
    const hasTemaEjemplo = /Tema de ejemplo/i.test(text);
    console.log(`BUG-001 (no "Tema de ejemplo"): ${hasTemaEjemplo ? 'FAIL' : 'PASS'}`);
    
    // BUG-002: No Cyrillic
    const hasCyrillic = /[а-яА-ЯЁё]/.test(text);
    console.log(`BUG-002 (no cyrillic): ${hasCyrillic ? 'FAIL' : 'PASS'}`);
    
    // BUG-003: No "secciones" typo
    const hasSeccionesTypo = /secciones/.test(text);
    console.log(`BUG-003 (no "secciones" typo): ${hasSeccionesTypo ? 'FAIL' : 'PASS'}`);
    
    // BUG-004: No "transversalas" typo
    const hasTransversalasTypo = /transversalas/.test(text);
    console.log(`BUG-004 (no "transversalas" typo): ${hasTransversalasTypo ? 'FAIL' : 'PASS'}`);
    
    // BUG-005: Has teacher name (Misterruddy@laspalmas.edu.bo)
    const hasTeacherName = /Misterruddy/i.test(text);
    console.log(`BUG-005 (has teacher name): ${hasTeacherName ? 'PASS' : 'FAIL'}`);
    
    // Additional checks
    const hasSchool = /Las Palmas/i.test(text);
    console.log(`Teacher personalization (school): ${hasSchool ? 'PASS' : 'FAIL'}`);
    
    // Check for real topics from our test
    const hasRealTopic = /Guede|Panku|pájaro/i.test(text);
    console.log(`Real topics used: ${hasRealTopic ? 'PASS' : 'FAIL'}`);
    
    // Print some excerpts
    console.log('\n=== SAMPLE TEXT ===');
    const excerpts = text.split(/\s+/).slice(0, 50).join(' ');
    console.log(excerpts);
    
    console.log('\n=== ALL SLIDE TEXT ===');
    console.log(text.substring(0, 2000));
}

main().catch(console.error);
