const JSZip = require('jszip');
const fs = require('fs');

async function main() {
    const buf = fs.readFileSync('D:/Temp/opencode/verify_v6/PRIA_Diapositivas.pptx');
    const zip = await JSZip.loadAsync(buf);
    
    const slides = Object.keys(zip.files).filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/));
    console.log('Slides:', slides.length);
    
    // Read each slide text
    for (let i = 1; i <= slides.length; i++) {
        const slideFile = 'ppt/slides/slide' + i + '.xml';
        if (zip.files[slideFile]) {
            const xml = await zip.files[slideFile].async('text');
            const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
            const shapes = (xml.match(/<p:sp>/g) || []).length;
            console.log(`\nSlide ${i} (${shapes} shapes):`);
            console.log('  ' + texts.slice(0, 8).join(' | '));
        }
    }
}

main().catch(console.error);
