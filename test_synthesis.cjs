const PptxGenJS = require('pptxgenjs');

async function main() {
    console.log('Testing synthesis-like slide...');
    
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    
    const SLIDE_W = 10;
    const SLIDE_H = 5.625;
    const MARGIN = 0.5;
    const HEADER_H = 0.5;
    const CONTENT_W = SLIDE_W - MARGIN * 2;
    const COLORS = {
        primary: '#0F766E',
        accent: '#FF6B6B',
        bg: '#FAFAF7',
        surface: '#F5F5F0',
        text: '#1F2937',
        textMuted: '#6B7280',
        textLight: '#FFFFFF',
        border: '#E5E5E0'
    };
    const PAGE_NUM_X = 9.3;
    const PAGE_NUM_Y = 5.1;
    
    // Slide 1 - Cover-like
    const slide1 = pptx.addSlide();
    slide1.background = { color: COLORS.bg };
    slide1.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 3.8, h: SLIDE_H,
        fill: { color: COLORS.primary }
    });
    slide1.addText('PRIA', {
        x: 0.4, y: 4.8, w: 3, h: 0.5,
        fontSize: 24, fontFace: 'Arial', bold: true,
        color: COLORS.textLight
    });
    slide1.addText('Síntesis Curricular', {
        x: 4.3, y: 2.0, w: 5, h: 2.5,
        fontSize: 90, fontFace: 'Arial', bold: true,
        color: COLORS.primary
    });
    
    // Slide 2 - Objectives
    const slide2 = pptx.addSlide();
    slide2.background = { color: COLORS.bg };
    slide2.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
        fill: { color: COLORS.primary }
    });
    slide2.addText('Objetivos de Aprendizaje', {
        x: MARGIN, y: 0, w: 8, h: HEADER_H,
        fontSize: 16, fontFace: 'Arial', bold: true,
        color: COLORS.textLight, valign: 'middle'
    });
    
    let y = HEADER_H + 0.35;
    const objectives = [
        'Recordar el mito ayoreo de Guede',
        'Comprender el mito chino de Panku',
        'Aplicar conceptos en un proyecto'
    ];
    objectives.forEach((obj, i) => {
        // Number badge
        slide2.addShape(pptx.ShapeType.roundRect, {
            x: MARGIN, y, w: 0.4, h: 0.4,
            fill: { color: COLORS.primary }, rectRadius: 0.08
        });
        slide2.addText(String(i + 1), {
            x: MARGIN, y, w: 0.4, h: 0.4,
            fontSize: 14, fontFace: 'Arial', bold: true,
            color: COLORS.textLight, align: 'center', valign: 'middle'
        });
        // Text
        slide2.addText(obj, {
            x: MARGIN + 0.55, y, w: CONTENT_W - 0.55, h: 0.4,
            fontSize: 16, fontFace: 'Arial',
            color: COLORS.text, valign: 'middle'
        });
        y += 0.55;
    });
    
    // Slide 3 - Topic slide (like my new code)
    const slide3 = pptx.addSlide();
    slide3.background = { color: COLORS.bg };
    
    // Left accent bar
    slide3.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.12, h: SLIDE_H,
        fill: { color: COLORS.primary }
    });
    
    // Number badge
    slide3.addShape(pptx.ShapeType.ellipse, {
        x: MARGIN, y: MARGIN, w: 0.5, h: 0.5,
        fill: { color: COLORS.primary }
    });
    slide3.addText('1', {
        x: MARGIN, y: MARGIN, w: 0.5, h: 0.5,
        fontSize: 16, fontFace: 'Arial', bold: true,
        color: COLORS.textLight, align: 'center', valign: 'middle'
    });
    
    // Title
    slide3.addText('Guede pinta los animales', {
        x: MARGIN + 0.7, y: MARGIN, w: CONTENT_W - 0.7, h: 0.5,
        fontSize: 24, fontFace: 'Arial', bold: true,
        color: COLORS.text, valign: 'middle'
    });
    
    // Divider
    slide3.addShape(pptx.ShapeType.rect, {
        x: MARGIN, y: 1.1, w: CONTENT_W, h: 0.03,
        fill: { color: COLORS.border }
    });
    
    // CONCEPTO label
    slide3.addText('CONCEPTO', {
        x: MARGIN, y: 1.35, w: 1.5, h: 0.3,
        fontSize: 9, fontFace: 'Arial', bold: true,
        color: COLORS.primary
    });
    
    // Concept bullets
    const concepts = [
        'Mito ayoreo sobre el origen de los colores',
        'Los animales pidieron al Sol que los transformara',
        'Transformación solar'
    ];
    let conceptY = 1.7;
    concepts.forEach((concept) => {
        slide3.addShape(pptx.ShapeType.ellipse, {
            x: MARGIN + 0.1, y: conceptY + 0.12, w: 0.12, h: 0.12,
            fill: { color: COLORS.accent }
        });
        slide3.addText(concept, {
            x: MARGIN + 0.35, y: conceptY, w: CONTENT_W - 0.5, h: 0.4,
            fontSize: 16, fontFace: 'Arial',
            color: COLORS.text, valign: 'top'
        });
        conceptY += 0.45;
    });
    
    // Page number
    slide3.addText('3', {
        x: PAGE_NUM_X - 0.15, y: PAGE_NUM_Y - 0.15, w: 0.4, h: 0.4,
        fontSize: 10, fontFace: 'Arial', bold: true,
        color: COLORS.textMuted, align: 'center', valign: 'middle'
    });
    
    console.log('Saving...');
    const buffer = await pptx.writeFile({ fileName: 'D:/Temp/opencode/verify_v6/test_synthesis.pptx' });
    console.log('Saved!');
}

main().catch(e => console.error('Error:', e.message));
