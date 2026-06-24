const JSZip = require('jszip');
const fs = require('fs');

async function main() {
    const buf = fs.readFileSync('D:/Temp/opencode/verify_v6/PRIA_Sintesis.pptx');
    const zip = await JSZip.loadAsync(buf);
    
    const pres = await zip.files['ppt/presentation.xml'].async('text');
    
    // Find all sldId entries
    const matches = pres.match(/<p:sldId[^>]+>/g) || [];
    console.log('All sldId entries:');
    matches.forEach((m, i) => console.log(i + 1 + ':', m));
    
    // Extract IDs
    const ids = matches.map(m => {
        const idMatch = m.match(/id="(\d+)"/);
        const rIdMatch = m.match(/r:id="([^"]+)"/);
        return { id: idMatch ? idMatch[1] : null, rId: rIdMatch ? rIdMatch[1] : null };
    });
    
    console.log('\nExtracted IDs:');
    ids.forEach((id, i) => console.log(i + 1 + ':', JSON.stringify(id)));
    
    // Check for duplicates
    const idCount = {};
    ids.forEach(id => {
        if (id.id) {
            idCount[id.id] = (idCount[id.id] || 0) + 1;
        }
    });
    
    console.log('\nID counts (duplicates have count > 1):');
    Object.entries(idCount).forEach(([id, count]) => {
        if (count > 1) console.log('⚠️  DUPLICATE ID:', id, 'appears', count, 'times');
    });
}

main().catch(console.error);
