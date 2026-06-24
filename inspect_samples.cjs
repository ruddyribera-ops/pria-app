const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

(async () => {
  const folder = 'D:/Temp/opencode/tangibles_v2/Sample Slides';
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.pptx') && !f.includes('SOCIALES_U2_T2'));
  for (const f of files) {
    const fp = path.join(folder, f);
    console.log('\n=== ' + f + ' (' + (fs.statSync(fp).size / 1024).toFixed(1) + ' KB) ===');
    const zip = await JSZip.loadAsync(fs.readFileSync(fp));
    const slides = Object.keys(zip.files).filter(n => n.match(/^ppt\/slides\/slide\d+\.xml$/));
    console.log('Slides:', slides.length);
    
    const slide1 = await zip.files['ppt/slides/slide1.xml'].async('text');
    const texts = (slide1.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
    console.log('Slide 1 text:', texts.slice(0, 8).join(' | '));
    
    if (slides.length > 1) {
      const slide2 = await zip.files['ppt/slides/slide2.xml'].async('text');
      const texts2 = (slide2.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
      console.log('Slide 2 text:', texts2.slice(0, 8).join(' | '));
    }
    if (slides.length > 2) {
      const slide3 = await zip.files['ppt/slides/slide3.xml'].async('text');
      const texts3 = (slide3.match(/<a:t>([^<]+)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
      console.log('Slide 3 text:', texts3.slice(0, 8).join(' | '));
    }
  }
})();