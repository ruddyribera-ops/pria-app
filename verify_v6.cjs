const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function checkCover(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slide1 = await zip.files['ppt/slides/slide1.xml'].async('text');
  const fontSizes = [...slide1.matchAll(/sz="(\d+)"/g)].map(m => parseInt(m[1]));
  const texts = (slide1.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
  return { fontSizes: [...new Set(fontSizes)].sort((a,b) => b-a), texts: texts.slice(0, 8) };
}

(async () => {
  const dir = 'D:/Temp/opencode/tangibles_v6';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pptx'));
  for (const f of files) {
    const r = await checkCover(path.join(dir, f));
    const has90 = r.fontSizes.includes(90);
    const hasLarge = r.fontSizes.some(s => s >= 60);
    console.log(`${f}:`);
    console.log(`  Cover text: ${r.texts.join(' | ')}`);
    console.log(`  Has 90pt (hero word): ${has90 ? 'YES' : 'no'}`);
    console.log(`  Has >=60pt: ${hasLarge ? 'YES' : 'no'}`);
    console.log(`  Font sizes (desc): ${r.fontSizes.join(', ')}`);
  }
})();