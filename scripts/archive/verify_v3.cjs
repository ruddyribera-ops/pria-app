// verify_v3.js — Inspect generated v3 PPTX content for design quality markers
// Confirms subject badge, objetivos slide, Bloom verbs, callout boxes
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function checkPptx(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files).filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/)).sort();
  const result = {
    slides: slideFiles.length,
    contents: [],
    rawJoined: ''
  };

  for (const f of slideFiles) {
    const xml = await zip.files[f].async('text');
    const texts = (xml.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, '')).filter(t => t.trim());
    result.contents.push(texts);
    result.rawJoined += texts.join(' ') + ' ';
  }

  // Look for design markers in entire pptx (slides + theme + slideMaster)
  const allXml = await Promise.all(
    Object.keys(zip.files)
      .filter(n => n.endsWith('.xml'))
      .map(n => zip.files[n].async('text'))
  );
  const allXmlJoined = allXml.join(' ');

  result.markers = {
    // Look for OBJETIVOS badge header on any slide (always-on slide from buildSlidesSlides)
    objetivos: /OBJETIVOS|objetivos?\s+de\s+aprendizaje/i.test(allXmlJoined),
    // Bloom's taxonomy verbs
    bloomVerbs: /\b(recordar|comprender|aplicar|analizar|sintetizar|evaluar|reconocer|identificar|describir|explicar|comparar|crear|producir)\b/i.test(result.rawJoined),
    definicionCallout: /\bDEFINICI(Ó|O)N\b/.test(allXmlJoined),
    ejemploCallout: /\bEJEMPLO\b/.test(allXmlJoined),
    // Subject badge candidates
    subjectBadge: /\b(Ortograf(í|i)a|Escrita|Lenguaje\s+y\s+Comunicaci(ó|o)n|Matem(á|a)ticas|Ciencias\s+Naturales|Ciencias\s+Sociales|Comunicaci(ó|o)n)\b/i.test(result.rawJoined),
    teacherEmail: /@/.test(allXmlJoined) || /PRIA\s*v?\s*10\s*[\u2022•·\-]\s*\d{4}/i.test(result.rawJoined),
    footerPattern: /PRIA\s*v?\s*10/i.test(allXmlJoined),
  };

  return result;
}

(async () => {
  const dir = 'D:/Temp/opencode/tangibles_v3';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pptx')).sort();
  const summary = [];

  for (const f of files) {
    const r = await checkPptx(path.join(dir, f));
    const m = r.markers;
    console.log(`\n=== ${f} (${r.slides} slides) ===`);
    console.log(`  Objetivos slide: ${m.objetivos ? '✅' : '❌'}`);
    console.log(`  Bloom verbs:     ${m.bloomVerbs ? '✅' : '❌'}`);
    console.log(`  DEFINICIÓN box:  ${m.definicionCallout ? '✅' : '❌'}`);
    console.log(`  EJEMPLO box:     ${m.ejemploCallout ? '✅' : '❌'}`);
    console.log(`  Subject badge:   ${m.subjectBadge ? '✅' : '❌'}`);
    console.log(`  Teacher footer:  ${m.footerPattern ? '✅' : '❌'}`);

    console.log(`  Slide 1 text:    ${r.contents[0] ? r.contents[0].slice(0, 6).join(' | ') : '(empty)'}`);
    if (r.contents.length > 1) {
      console.log(`  Slide 2 text:    ${r.contents[1].slice(0, 6).join(' | ')}`);
    }
    if (r.contents.length > 2) {
      console.log(`  Slide 3 text:    ${r.contents[2].slice(0, 6).join(' | ')}`);
    }
    // Show DEFINICION/EJEMPLO slide contents if found
    r.contents.forEach((slide, idx) => {
      const joined = slide.join(' ');
      if (/DEFINICI(Ó|O)N|EJEMPLO|OBJETIVOS/i.test(joined)) {
        console.log(`  [Slide ${idx+1} marker] ${slide.slice(0, 5).join(' | ')}`);
      }
    });

    summary.push({ file: f, slides: r.slides, ...m });
  }

  console.log('\n=== SUMMARY TABLE ===');
  console.log('File                              | Slides | Obj | Bloom | Def | Ej | Subj | Footer');
  console.log('----------------------------------|--------|-----|-------|-----|----|----|-------');
  for (const s of summary) {
    const name = s.file.padEnd(33);
    const sl = String(s.slides).padEnd(7);
    const mark = (b) => b ? ' ✅ ' : ' ❌ ';
    console.log(`${name}| ${sl}|${mark(s.objetivos)}|${mark(s.bloomVerbs)} |${mark(s.definicionCallout)} |${mark(s.ejemploCallout)}|${mark(s.subjectBadge)} |${mark(s.footerPattern)}`);
  }

  // Write JSON for QUALITY_REPORT consumption
  fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(summary, null, 2));
})();
