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
    const text = await readPptx(pptxPath);
    
    // Check for exact typo "transversalas" (not transversales)
    const typoIndex = text.indexOf('transversalas');
    const correctIndex = text.indexOf('transversales');
    
    console.log('=== TYPO CHECK ===');
    console.log(`Contains "transversalas" (typo): ${typoIndex >= 0 ? 'YES at index ' + typoIndex : 'NO'}`);
    console.log(`Contains "transversales" (correct): ${correctIndex >= 0 ? 'YES at index ' + correctIndex : 'NO'}`);
    
    // Show surrounding context if typo exists
    if (typoIndex >= 0) {
        console.log('\nContext around typo:');
        console.log(text.substring(Math.max(0, typoIndex - 50), typoIndex + 60));
    }
    
    // Show all words containing "transversal"
    const matches = text.match(/\w*transversal\w*/gi);
    console.log('\nAll words matching "transversal*":', matches);
}

main().catch(console.error);
