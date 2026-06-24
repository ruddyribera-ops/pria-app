const JSZip = require('jszip');
const fs = require('fs');

async function inspectPptxErrors(filePath) {
    console.log('Checking PPTX structure:', filePath);
    
    try {
        const buf = fs.readFileSync(filePath);
        console.log('File size:', buf.length, 'bytes');
        console.log('File header:', buf.slice(0, 4).toString('hex'));
        
        const zip = await JSZip.loadAsync(buf);
        
        // Check required files
        const requiredFiles = [
            '[Content_Types].xml',
            '_rels/.rels',
            'ppt/presentation.xml',
            'ppt/_rels/presentation.xml.rels'
        ];
        
        console.log('\n=== Checking required files ===');
        for (const f of requiredFiles) {
            if (zip.files[f]) {
                console.log('✓', f);
            } else {
                console.log('✗ MISSING:', f);
            }
        }
        
        // List all files
        console.log('\n=== All files in archive ===');
        const allFiles = Object.keys(zip.files);
        console.log('Total:', allFiles.length);
        allFiles.slice(0, 30).forEach(f => console.log(' ', f));
        
        // Check presentation.xml
        console.log('\n=== presentation.xml ===');
        if (zip.files['ppt/presentation.xml']) {
            const xml = await zip.files['ppt/presentation.xml'].async('text');
            console.log('Size:', xml.length, 'bytes');
            console.log('First 500 chars:', xml.slice(0, 500));
        }
        
        // Check slides
        console.log('\n=== Slides ===');
        const slides = allFiles.filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/));
        console.log('Slide count:', slides.length);
        
        // Validate each slide XML
        console.log('\n=== Validating slide XML ===');
        for (let i = 1; i <= Math.min(slides.length, 5); i++) {
            const slideFile = 'ppt/slides/slide' + i + '.xml';
            if (zip.files[slideFile]) {
                try {
                    const xml = await zip.files[slideFile].async('text');
                    // Check for common issues
                    const hasClosingTags = xml.includes('</p:sp>') || xml.includes('</p:pic>');
                    const hasPTags = xml.includes('<p:');
                    console.log('Slide', i, '- size:', xml.length, '- has p: tags:', hasPTags, '- has closing:', hasClosingTags);
                    
                    // Check for invalid chars
                    const invalidChars = xml.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
                    if (invalidChars) {
                        console.log('  ⚠️ Invalid XML control characters found!');
                    }
                } catch (e) {
                    console.log('Slide', i, 'ERROR:', e.message);
                }
            }
        }
        
        // Check relationships
        console.log('\n=== Relationships ===');
        if (zip.files['ppt/_rels/presentation.xml.rels']) {
            const rels = await zip.files['ppt/_rels/presentation.xml.rels'].async('text');
            console.log('presentation.xml.rels length:', rels.length);
            // Count slide references
            const slideRefs = (rels.match(/Target="slides\/slide/g) || []).length;
            console.log('Slide references in rels:', slideRefs);
        }
        
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}

async function main() {
    await inspectPptxErrors('D:/Temp/opencode/verify_v6/PRIA_Sintesis.pptx');
}

main().catch(console.error);
