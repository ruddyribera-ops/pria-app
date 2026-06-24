const JSZip = require('jszip');
const fs = require('fs');

async function inspectPptx(filePath, label) {
    console.log('\n=== ' + label + ' ===');
    console.log('File:', filePath);
    const stats = fs.statSync(filePath);
    console.log('Size:', Math.round(stats.size / 1024), 'KB');
    
    try {
        const buf = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buf);
        
        const slides = Object.keys(zip.files).filter(n => n.match(/ppt\/slides\/slide\d+\.xml$/));
        console.log('Slides:', slides.length);
        
        const layouts = Object.keys(zip.files).filter(n => n.match(/ppt\/slideLayouts\//));
        const images = Object.keys(zip.files).filter(n => n.match(/ppt\/media\//));
        console.log('Layouts:', layouts.length, '| Images:', images.length);
        
        // Read first 5 slides
        for (let i = 1; i <= Math.min(5, slides.length); i++) {
            const slideFile = 'ppt/slides/slide' + i + '.xml';
            if (zip.files[slideFile]) {
                const xml = await zip.files[slideFile].async('text');
                const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
                const shapes = (xml.match(/<p:sp>/g) || []).length;
                const images = (xml.match(/<p:pic>/g) || []).length;
                console.log('\nSlide ' + i + ' (' + shapes + ' shapes, ' + images + ' pics):');
                console.log('  ' + texts.slice(0, 10).join(' | '));
            }
        }
        
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function main() {
    await inspectPptx('D:/Temp/equations-and-their-graphs-0df7fe90/HandCrafted/SOCIALES_U2_T1_Origen de los pueblos en America.pptx', 'HANDCRAFTED (Sociales)');
    await inspectPptx('D:/Temp/equations-and-their-graphs-0df7fe90/HandCrafted/Tema_8_Uso_de_la_tilde.pptx', 'HANDCRAFTED (Tilde)');
    await inspectPptx('D:/Temp/opencode/verify_v6/PRIA_Sintesis.pptx', 'PRIA OUTPUT');
}

main().catch(console.error);
