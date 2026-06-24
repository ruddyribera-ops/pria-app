const PptxGenJS = require('pptxgenjs');

async function main() {
    console.log('Testing simple PPTX generation...');
    
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    
    // Slide 1 - simple
    const slide1 = pptx.addSlide();
    slide1.addText('PRIA Test', { x: 1, y: 1, w: 5, h: 1, fontSize: 36, color: '0F766E' });
    slide1.addText('Simple test slide', { x: 1, y: 2, w: 5, h: 0.5, fontSize: 18, color: '1F2937' });
    
    // Slide 2 - with shape
    const slide2 = pptx.addSlide();
    slide2.addShape(pptx.ShapeType.rect, { x: 1, y: 1, w: 3, h: 2, fill: { color: 'F5F5F0' } });
    slide2.addText('With shape', { x: 1.2, y: 1.2, w: 2.6, h: 0.5, fontSize: 18, color: '0F766E' });
    
    // Slide 3 - with more shapes
    const slide3 = pptx.addSlide();
    slide3.addShape(pptx.ShapeType.ellipse, { x: 1, y: 1, w: 0.5, h: 0.5, fill: { color: 'FF6B6B' } });
    slide3.addText('Number 1', { x: 1.6, y: 1.1, w: 3, h: 0.3, fontSize: 14, color: '1F2937' });
    
    console.log('Saving...');
    const buffer = await pptx.writeFile({ fileName: 'D:/Temp/opencode/verify_v6/test_simple.pptx' });
    console.log('Saved! Size:', buffer.length, 'bytes');
}

main().catch(console.error);
