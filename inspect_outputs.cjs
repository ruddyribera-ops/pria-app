const JSZip = require('jszip');
const fs = require('fs');

async function inspectPptx(filePath) {
    console.log('=== PPTX INSPECTION ===');
    const buf = fs.readFileSync(filePath);
    console.log('Size:', buf.length, 'bytes');
    try {
        const zip = await JSZip.loadAsync(buf);
        console.log('Valid PPTX: YES, files:', zip.files.length);
        const slides = Object.keys(zip.files).filter(n => n.match(/ppt\/slides\/slide/));
        console.log('Slides:', slides.length);
        for (let i = 1; i <= Math.min(3, slides.length); i++) {
            const slideFile = 'ppt/slides/slide' + i + '.xml';
            if (zip.files[slideFile]) {
                const xml = await zip.files[slideFile].async('text');
                const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
                console.log('Slide ' + i + ':', texts.slice(0, 5).join(' | '));
            }
        }
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}

async function inspectPdf(filePath) {
    console.log('\n=== PDF INSPECTION ===');
    const buf = fs.readFileSync(filePath);
    console.log('Size:', buf.length, 'bytes');
    console.log('Header:', buf.slice(0, 8).toString('ascii'));
}

async function inspectDocx(filePath) {
    console.log('\n=== DOCX INSPECTION ===');
    const buf = fs.readFileSync(filePath);
    console.log('Size:', buf.length, 'bytes');
    try {
        const zip = await JSZip.loadAsync(buf);
        console.log('Valid DOCX: YES');
        if (zip.files['word/document.xml']) {
            const xml = await zip.files['word/document.xml'].async('text');
            const texts = (xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, ''));
            console.log('Text:', texts.slice(0, 20).join(' | '));
        }
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}

async function main() {
    const base = 'D:/Temp/opencode/verify_v6';
    await inspectPptx(base + '/PRIA_Sintesis.pptx');
    await inspectPdf(base + '/PRIA_Sintesis.pdf');
    await inspectDocx(base + '/PRIA_Sintesis.docx');
}

main().catch(console.error);
