const JSZip = require('jszip');
const fs = require('fs');

async function checkFile(filePath, label) {
    console.log('\n=== ' + label + ' ===');
    const buf = fs.readFileSync(filePath);
    console.log('Size:', buf.length, 'bytes');
    
    try {
        const zip = await JSZip.loadAsync(buf);
        
        // Check [Content_Types].xml
        if (zip.files['[Content_Types].xml']) {
            const ct = await zip.files['[Content_Types].xml'].async('text');
            // Check for duplicate content types
            const overrides = ct.match(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"/g) || [];
            console.log('Slide overrides in [Content_Types].xml:', overrides.length);
        }
        
        // Check presentation.xml for slide references
        if (zip.files['ppt/presentation.xml']) {
            const pres = await zip.files['ppt/presentation.xml'].async('text');
            const sldIds = pres.match(/<p:sldId[^>]+>/g) || [];
            console.log('Slide IDs in presentation.xml:', sldIds.length);
            
            // Check for duplicate IDs
            const ids = sldIds.map(s => {
                const m = s.match(/id="(\d+)"/);
                return m ? m[1] : null;
            }).filter(Boolean);
            const uniqueIds = [...new Set(ids)];
            console.log('Unique slide IDs:', uniqueIds.length, '(should match count)');
            if (ids.length !== uniqueIds.length) {
                console.log('⚠️  DUPLICATE SLIDE IDs DETECTED!');
            }
        }
        
        // Check rels
        if (zip.files['ppt/_rels/presentation.xml.rels']) {
            const rels = await zip.files['ppt/_rels/presentation.xml.rels'].async('text');
            const targets = rels.match(/Target="slides\/slide\d+\.xml"/g) || [];
            console.log('Slide targets in rels:', targets.length);
        }
        
        // Try to read each slide
        const slideFiles = Object.keys(zip.files).filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/));
        console.log('Actual slide files:', slideFiles.length);
        
        // Check each slide XML validity
        for (const slideFile of slideFiles.slice(0, 3)) {
            try {
                const xml = await zip.files[slideFile].async('text');
                // Check if XML is well-formed
                if (!xml.includes('<?xml') && !xml.startsWith('<')) {
                    console.log('⚠️  ' + slideFile + ' does not start with < or <?xml');
                }
                // Check for common issues
                if (xml.length < 100) {
                    console.log('⚠️  ' + slideFile + ' is suspiciously small:', xml.length, 'bytes');
                }
            } catch (e) {
                console.log('ERROR reading ' + slideFile + ':', e.message);
            }
        }
        
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}

async function main() {
    await checkFile('D:/Temp/opencode/verify_v6/PRIA_Sintesis.pptx', 'PRIA_SINTESIS (current)');
    await checkFile('D:/Temp/opencode/verify_v6/test_synthesis.pptx', 'TEST_SYNTHESIS (manual)');
}

main().catch(console.error);
