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
        
        // Count slides
        const slides = Object.keys(zip.files).filter(n => n.match(/ppt\/slides\/slide\d+\.xml$/));
        console.log('Slides:', slides.length);
        
        // Read slide layouts
        const layouts = Object.keys(zip.files).filter(n => n.match(/ppt\/slideLayouts\//));
        console.log('Layouts:', layouts.length);
        
        // Read slide masters
        const masters = Object.keys(zip.files).filter(n => n.match(/ppt\/slideMasters\//));
        console.log('Masters:', masters.length);
        
        // Read theme
        const themes = Object.keys(zip.files).filter(n => n.match(/ppt\/theme\//));
        console.log('Themes:', themes.length);
        
        // Check for images
        const images = Object.keys(zip.files).filter(n => n.match(/ppt\/media\//));
        console.log('Media/images:', images.length);
        
        // Read first 3 slides content
        console.log('\n--- Slide content samples ---');
        for (let i = 1; i <= Math.min(5, slides.length); i++) {
            const slideFile = 'ppt/slides/slide' + i + '.xml';
            if (zip.files[slideFile]) {
                const xml = await zip.files[slideFile].async('text');
                // Extract text
                const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
                console.log('\nSlide ' + i + ':');
                console.log('  Text:', texts.slice(0, 15).join(' | '));
                // Check for shapes, images
                const shapes = (xml.match(/<p:sp>/g) || []).length;
                const images = (xml.match(/<p:pic>/g) || []).length;
                console.log('  Shapes:', shapes, '| Images:', images);
            }
        }
        
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function main() {
    await inspectPptx('D:/Temp/equations-and-their-graphs-0df7fe90/Equations_and_their_graphs_slide-deck.pptx', 'REFERENCE (National Academy)');
    await inspectPptx('D:/Temp/opencode/verify_v6/PRIA_Sintesis.pptx', 'PRIA OUTPUT');
}

main().catch(console.error);
