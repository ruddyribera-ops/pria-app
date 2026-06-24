const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function checkPptx(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files).filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/));
  const result = { slides: slideFiles.length, contents: [] };
  for (const f of slideFiles) {
    const xml = await zip.files[f].async('text');
    const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, '')).filter(t => t.trim());
    result.contents.push(texts);
  }
  return result;
}

(async () => {
  const dir = 'D:/Temp/opencode/tangibles_v4';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pptx'));
  
  for (const f of files) {
    const r = await checkPptx(path.join(dir, f));
    const allText = r.contents.flat().join(' ');
    console.log(`\n=== ${f} (${r.slides} slides, ${(fs.statSync(path.join(dir, f)).size / 1024).toFixed(1)} KB) ===`);
    console.log(`  Objetivos slide: ${r.contents.some(s => /objetivos de aprendizaje/i.test(s.join(' '))) ? 'OK' : 'MISSING'}`);
    console.log(`  PLENARIO: ${r.contents.some(s => /plenario|cierre/i.test(s.join(' '))) ? 'OK' : 'MISSING'}`);
    console.log(`  ACTIVIDAD: ${r.contents.some(s => /actividad/i.test(s.join(' '))) ? 'OK' : 'MISSING'}`);
    console.log(`  Teacher email: ${/laspalmas\.edu\.bo/i.test(allText) ? 'OK' : 'MISSING'}`);
    console.log(`  Spanish date: ${/lunes|viernes|mi[ée]rcoles/i.test(allText) ? 'OK' : 'MISSING'}`);
    console.log(`  JSON dump: ${/\{\"/.test(allText) ? 'LEAK' : 'OK clean'}`);
    console.log(`  Lenguaje content: ${/expresi[oó]n|comunicaci[oó]n|tilde/i.test(allText) ? 'OK' : 'MISSING'}`);
  }
})();
