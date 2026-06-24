const JSZip = require('jszip');
const fs = require('fs');

async function inspectPptx(filePath, label) {
    console.log('\n=== ' + label + ' ===');
    const stats = fs.statSync(filePath);
    console.log('Size:', Math.round(stats.size / 1024), 'KB');
    
    try {
        const buf = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buf);
        const slides = Object.keys(zip.files).filter(n => n.match(/ppt\/slides\/slide\d+\.xml$/));
        console.log('Total slides:', slides.length);
        
        // Read ALL slides
        for (let i = 1; i <= slides.length; i++) {
            const slideFile = 'ppt/slides/slide' + i + '.xml';
            if (zip.files[slideFile]) {
                const xml = await zip.files[slideFile].async('text');
                const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
                const shapes = (xml.match(/<p:sp>/g) || []).length;
                console.log('\nSlide ' + i + ' (' + shapes + ' shapes):');
                console.log('  TEXT:', texts.slice(0, 8).join(' | '));
            }
        }
        
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function main() {
    await inspectPptx('D:/Temp/opencode/verify_v6/PRIA_Sintesis.pptx', 'PRIA V2');
}

main().catch(console.error);
