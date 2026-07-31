const JSZip = require('jszip');
const fs = require('fs');

async function checkSlideXml(filePath, slideNum) {
    const buf = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buf);
    const slideFile = 'ppt/slides/slide' + slideNum + '.xml';
    const xml = await zip.files[slideFile].async('text');
    return xml;
}

async function main() {
    const filePath = 'D:/Temp/opencode/verify_v6/PRIA_Sintesis.pptx';
    
    // Check slide 1
    console.log('=== Checking Slide 1 XML ===');
    const slide1 = await checkSlideXml(filePath, 1);
    
    // Check for issues
    console.log('\n1. Length:', slide1.length);
    
    // Check for control characters
    const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(slide1);
    console.log('2. Has control chars:', controlChars);
    
    // Check for unescaped special chars in XML values
    console.log('3. Contains "&" (should be &amp;):', slide1.includes('&') && !slide1.includes('&amp;') && !slide1.includes('&lt;') && !slide1.includes('&gt;'));
    
    // Check for HTML entities that shouldn't be there
    console.log('4. Contains <a:para> instead of <a:p>:', slide1.includes('<a:para>'));
    
    // Look for malformed tags
    console.log('5. Sample of text content:');
    const texts = slide1.match(/<a:t>([^<]+)<\/a:t>/g);
    if (texts) {
        texts.slice(0, 5).forEach(t => console.log('   ', t));
    }
    
    // Check presentation.xml relationships
    const buf = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buf);
    const rels = await zip.files['ppt/_rels/presentation.xml.rels'].async('text');
    console.log('\n=== presentation.xml.rels ===');
    console.log(rels);
    
    // Check slide rels
    console.log('\n=== slide1.xml.rels ===');
    const slide1Rels = await zip.files['ppt/slides/_rels/slide1.xml.rels'].async('text');
    console.log(slide1Rels);
}

main().catch(console.error);
