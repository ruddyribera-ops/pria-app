const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

function decodeXmlEntities(s) {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function checkPptx(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files).filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/));
  const allText = [];
  for (const f of slideFiles) {
    const xml = await zip.files[f].async('text');
    const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || [])
      .map(t => decodeXmlEntities(t.replace(/<\/?a:t>/g, '')))
      .filter(t => t.trim());
    allText.push(texts);
  }
  return { slides: slideFiles.length, contents: allText, allFlat: allText.flat().join(' ') };
}

(async () => {
  const dir = 'D:/Temp/opencode/tangibles_v5';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pptx')).sort();

  for (const f of files) {
    const r = await checkPptx(path.join(dir, f));
    const sizeKB = (fs.statSync(path.join(dir, f)).size / 1024).toFixed(1);
    console.log(`\n=== ${f} (${r.slides} slides, ${sizeKB} KB) ===`);
    console.log('Topic-specific content check (entities decoded):');
    console.log(`  Guede:           ${/gued[eé]/i.test(r.allFlat) ? 'PASS' : 'FAIL'}`);
    console.log(`  P'an-ku:         ${/p.an.?ku/i.test(r.allFlat) ? 'PASS' : 'FAIL'}`);
    console.log(`  pajaro de fuego: ${/p[áa]jaro de fuego/i.test(r.allFlat) ? 'PASS' : 'FAIL'}`);
    console.log(`  mito:            ${/mito/i.test(r.allFlat) ? 'PASS' : 'FAIL'}`);
    console.log(`  No generic filler: ${/materiales manipulativos|recursos tecnol/i.test(r.allFlat) ? 'FAIL' : 'PASS'}`);
    console.log(`  Topic count (≥3 expected): ${(r.allFlat.match(/gued[eé]|p.an.?ku|p[áa]jaro de fuego/gi) || []).length} topic mentions`);

    // Find first topic-specific slide
    for (let i = 0; i < r.contents.length; i++) {
      const txt = r.contents[i].join(' ');
      if (/gued[eé]|p.an.?ku|p[áa]jaro de fuego/i.test(txt)) {
        console.log(`  First topic-specific slide: slide${i + 1}`);
        console.log(`    Title fragment: ${r.contents[i].slice(0, 4).join(' | ').substring(0, 100)}`);
        break;
      }
    }
  }
})();
