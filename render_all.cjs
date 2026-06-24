// Render all 3 PPTX deliverables as HTML previews for visual evaluation
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.5;
const HEADER_H = 0.5;
const CONTENT_W = SLIDE_W - MARGIN * 2;

const COLORS = {
    primary: '#0F766E', primaryHover: '#0D9488', accent: '#FF6B6B', bg: '#FAFAF7',
    surface: '#F5F5F0', border: '#E5E5E0', text: '#1F2937', textMuted: '#6B7280', textLight: '#FFFFFF',
    success: '#10B981', warning: '#F59E0B', info: '#3B82F6', purple: '#7C3AED',
};

const FONTS = { body: 'Inter', title: 'Inter' };

// === DIAPOSITIVAS DATA ===
const DIAPOSITIVAS = [
    { tipo: 'cover', titulo: 'Diapositivas', meta: 'Guede pinta los animales' },
    { numero: 1, tipo: 'PORTADA', titulo: 'Guede pinta los animales', meta: 'Mito ayoreo sobre el origen de los colores', items: ['Damos la bienvenida y presentamos el tema. Explicamos brevemente que hoy conoceremos un mito de la cultura ayoreo.'] },
    { numero: 2, tipo: 'OBJETIVOS', titulo: '¿Qué aprenderemos hoy?', items: ['Conocer el mito ayoreo \'Guede pinta los animales\'', 'Identificar los personajes del relato', 'Comprender el mensaje cultural del mito'] },
    { numero: 3, tipo: 'CONCEPTO', titulo: 'Los Ayoreo: pueblo del Chaco', items: ['Pueblo indígena del Chaco paraguayo-boliviano', 'Cultura milenaria con rica tradición oral', 'Sus mitos explican el origen del mundo natural'] },
    { numero: 4, tipo: 'CONCEPTO', titulo: 'El Sol y los animales', items: ['Los animales no tenían colores', 'Estaban aburridos y apagados', 'Pidieron ayuda al Sol para transformarse'] },
    { numero: 5, tipo: 'CONCEPTO', titulo: 'Guede: el pintor del mundo', items: ['Guede fue el artista elegido', 'Pintó a cada animal con colores especiales', 'Cada color tiene un significado'] },
    { numero: 6, tipo: 'PAUSA', titulo: '¡A movernos como animales!', meta: 'Imita a un animal gris y aburrido:', items: ['Camina lento y con cara triste', 'Ahora imagina que Guede te pinta', 'Muévete feliz con tu nuevo color'] },
    { numero: 7, tipo: 'CONCEPTO', titulo: 'Colores con significado', items: ['Verde: el jaguar se camufla en la selva', 'Amarillo: el ave tropical brilla en el sol', 'Marrón: la tortuga se mezcla con la tierra'] },
    { numero: 8, tipo: 'CONCEPTO', titulo: 'Mensaje del mito', items: ['La naturaleza tiene un propósito', 'Cada ser vivo es único y valioso', 'Los pueblos indígenas respetan la vida'] },
];

const PLAN_CLASE = [
    { tipo: 'cover', titulo: 'Plan de Clase', meta: '45 minutos · 5to Primaria' },
    { tipo: '5E', titulo: 'Modelo Instruccional 5E', items: ['Engage · 7 min · Activar conocimiento previo', 'Explore · 12 min · Manipular materiales', 'Explain · 10 min · Lectura y análisis', 'Elaborate · 10 min · Aplicación creativa', 'Evaluate · 6 min · Ticket de salida'] },
    { tipo: 'inicio', titulo: 'Inicio - 10 min', items: ['Pregunta generadora', 'Mostrar imágenes de animales de diferentes colores', 'Activar conocimientos previos sobre mitos indígenas'] },
    { tipo: 'desarrollo', titulo: 'Desarrollo - 25 min', items: ['Lectura en voz alta del mito', 'Identificar secuencia narrativa', 'Trabajo en parejas para análisis cultural'] },
    { tipo: 'cierre', titulo: 'Cierre - 10 min', items: ['Ticket de salida creativo', 'Opción A: Dibujar un animal antes y después de Guede', 'Opción B: Escribir una frase sobre el cambio'] },
];

const QUIZ = [
    { tipo: 'cover', titulo: 'Pop Quiz', meta: '4 preguntas · 5 minutos' },
    { numero: '1/4', tipo: 'escrita', titulo: 'Pregunta 1', meta: 'En muchos mitos y leyendas, los animales pueden tener características mágicas o representaciones especiales. ¿Cuál de estos animales aparece frecuentemente en las leyendas?', items: ['A) El dragón', 'B) La hormiga común', 'C) La paloma', 'D) La lombriz'] },
    { numero: '2/4', tipo: 'oral', titulo: 'Pregunta 2', meta: 'Cuéntenle a su compañero: ¿Qué animal mitológico conoces que aparezca en cuentos o leyendas que hayas leído o escuchado?', items: ['1 minuto para compartir cada uno'] },
    { numero: '3/4', tipo: 'visual', titulo: 'Pregunta 3', meta: 'Dibuja un animal que aparece en un mito o leyenda que conozcas.', items: ['Puede ser un animal real con características mágicas', 'O una criatura imaginaria'] },
    { numero: '4/4', tipo: 'desafio', titulo: 'Pregunta 4', meta: 'Si tú pintaras un animal para una leyenda, ¿qué animal elegirías y qué poderes le darías?', items: ['Escribe o dibuja tu animal mitológico inventado'] },
];

function makeCoverSlide(pptx, slide, label) {
    const s = pptx.addSlide();
    s.background = { color: COLORS.bg };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 3.8, h: SLIDE_H, fill: { color: COLORS.primary } });
    s.addText('PRIA', { x: 0.4, y: 4.8, w: 3, h: 0.5, fontSize: 24, fontFace: 'Arial', bold: true, color: COLORS.textLight });
    s.addText(label, { x: 4.3, y: 1.5, w: 5, h: 1.5, fontSize: 50, fontFace: 'Arial', bold: true, color: COLORS.primary });
    s.addText(slide.meta, { x: 4.3, y: 3.0, w: 5, h: 0.5, fontSize: 14, fontFace: 'Arial', color: COLORS.textMuted });
    s.addText('Misterruddy · Misterruddy@laspalmas.edu.bo', { x: 4.3, y: 3.5, w: 5, h: 0.4, fontSize: 10, fontFace: 'Arial', color: COLORS.primary });
}

function makeContentSlide(pptx, slide) {
    const s = pptx.addSlide();
    s.background = { color: COLORS.bg };
    
    // Header
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: HEADER_H, fill: { color: COLORS.primary } });
    s.addText(String(slide.numero || ''), { x: MARGIN, y: 0, w: 0.4, h: HEADER_H, fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.textLight, valign: 'middle' });
    
    // Type badge
    const badgeColor = slide.tipo === 'PAUSA' ? COLORS.warning : 
                       slide.tipo === 'OBJETIVOS' ? COLORS.accent :
                       slide.tipo === 'PORTADA' ? COLORS.info : COLORS.primary;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 0.1, w: 1.3, h: 0.3, fill: { color: badgeColor }, rectRadius: 0.06 });
    s.addText(slide.tipo, { x: 0.7, y: 0.1, w: 1.3, h: 0.3, fontSize: 9, fontFace: 'Arial', bold: true, color: COLORS.textLight, align: 'center', valign: 'middle' });
    
    // Title
    s.addText(slide.titulo, { x: 2.1, y: 0, w: 6, h: HEADER_H, fontSize: 16, fontFace: 'Arial', bold: true, color: COLORS.textLight, valign: 'middle' });
    
    // Content
    let y = HEADER_H + 0.3;
    if (slide.tipo === 'CONCEPTO' || slide.tipo === 'OBJETIVOS') {
        s.addText('DEFINICIÓN', { x: MARGIN, y, w: 2, h: 0.25, fontSize: 9, fontFace: 'Arial', bold: true, color: COLORS.primary, charSpacing: 2 });
        y += 0.3;
    }
    if (slide.meta && slide.tipo === 'PORTADA') {
        s.addText(slide.meta, { x: MARGIN, y, w: CONTENT_W, h: 0.4, fontSize: 14, fontFace: 'Arial', italic: true, color: COLORS.primary });
        y += 0.5;
    }
    if (slide.meta && slide.tipo === 'PAUSA') {
        s.addText(slide.meta, { x: MARGIN, y, w: CONTENT_W, h: 0.4, fontSize: 16, fontFace: 'Arial', bold: true, color: COLORS.warning });
        y += 0.5;
    }
    
    (slide.items || []).forEach(item => {
        s.addShape(pptx.ShapeType.ellipse, { x: MARGIN + 0.1, y: y + 0.12, w: 0.1, h: 0.1, fill: { color: badgeColor } });
        s.addText(item, { x: MARGIN + 0.35, y, w: CONTENT_W - 0.4, h: 0.4, fontSize: 12, fontFace: 'Arial', color: COLORS.text, valign: 'top' });
        y += 0.4;
    });
    
    // Page number
    s.addText(String(slide.numero || ''), { x: SLIDE_W - 0.5, y: SLIDE_H - 0.4, w: 0.3, h: 0.3, fontSize: 9, fontFace: 'Arial', color: COLORS.textMuted, align: 'right' });
}

async function main() {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    
    // === DIAPOSITIVAS ===
    makeCoverSlide(pptx, DIAPOSITIVAS[0], 'Diapositivas');
    for (let i = 1; i < DIAPOSITIVAS.length; i++) {
        if (DIAPOSITIVAS[i].items) makeContentSlide(pptx, DIAPOSITIVAS[i]);
    }
    
    // === PLAN DE CLASE ===
    makeCoverSlide(pptx, PLAN_CLASE[0], 'Plan de Clase');
    
    // 5E slide - table
    const plan5eSlide = pptx.addSlide();
    plan5eSlide.background = { color: COLORS.bg };
    plan5eSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: HEADER_H, fill: { color: COLORS.primary } });
    plan5eSlide.addText('Modelo Instruccional 5E', { x: MARGIN, y: 0, w: 8, h: HEADER_H, fontSize: 16, fontFace: 'Arial', bold: true, color: COLORS.textLight, valign: 'middle' });
    (PLAN_CLASE[1].items || []).forEach((item, i) => {
        const y = HEADER_H + 0.4 + i * 0.55;
        plan5eSlide.addShape(pptx.ShapeType.roundRect, { x: MARGIN, y, w: 0.4, h: 0.4, fill: { color: COLORS.accent }, rectRadius: 0.08 });
        plan5eSlide.addText(String(i+1), { x: MARGIN, y, w: 0.4, h: 0.4, fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.textLight, align: 'center', valign: 'middle' });
        plan5eSlide.addText(item, { x: MARGIN + 0.55, y, w: CONTENT_W - 0.55, h: 0.4, fontSize: 11, fontFace: 'Arial', color: COLORS.text, valign: 'middle' });
    });
    
    for (let i = 2; i < PLAN_CLASE.length; i++) {
        if (PLAN_CLASE[i].items) makeContentSlide(pptx, PLAN_CLASE[i]);
    }
    
    // === QUIZ ===
    makeCoverSlide(pptx, QUIZ[0], 'Pop Quiz');
    for (let i = 1; i < QUIZ.length; i++) {
        const s = pptx.addSlide();
        s.background = { color: COLORS.bg };
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: HEADER_H, fill: { color: COLORS.accent } });
        s.addText(s.numero || '', { x: MARGIN, y: 0, w: 1.5, h: HEADER_H, fontSize: 14, fontFace: 'Arial', bold: true, color: COLORS.textLight, valign: 'middle' });
        s.addText((s.tipo || '').toUpperCase(), { x: 1.7, y: 0, w: 6, h: HEADER_H, fontSize: 12, fontFace: 'Arial', bold: true, color: COLORS.textLight, valign: 'middle' });
        
        s.addText(s.titulo, { x: MARGIN, y: HEADER_H + 0.3, w: CONTENT_W, h: 0.5, fontSize: 20, fontFace: 'Arial', bold: true, color: COLORS.text });
        s.addText(s.meta, { x: MARGIN, y: HEADER_H + 0.85, w: CONTENT_W, h: 1.5, fontSize: 13, fontFace: 'Arial', color: COLORS.text, valign: 'top' });
        
        let y = HEADER_H + 2.5;
        (s.items || []).forEach(item => {
            s.addShape(pptx.ShapeType.ellipse, { x: MARGIN + 0.1, y: y + 0.12, w: 0.1, h: 0.1, fill: { color: COLORS.accent } });
            s.addText(item, { x: MARGIN + 0.35, y, w: CONTENT_W - 0.4, h: 0.4, fontSize: 12, fontFace: 'Arial', color: COLORS.textMuted, valign: 'top' });
            y += 0.4;
        });
    }
    
    // Credits slide
    const creditsSlide = pptx.addSlide();
    creditsSlide.background = { color: COLORS.bg };
    creditsSlide.addText('PRIA v10', { x: 0, y: 1.8, w: SLIDE_W, h: 1, fontSize: 36, fontFace: 'Arial', bold: true, color: COLORS.primary, align: 'center' });
    creditsSlide.addText('Sistema de Planificación Docente con IA', { x: 0, y: 2.9, w: SLIDE_W, h: 0.5, fontSize: 16, fontFace: 'Arial', color: COLORS.textMuted, align: 'center' });
    
    await pptx.writeFile({ fileName: 'D:/Temp/opencode/verify_v6/ALL_DELIVERABLES.pptx' });
    console.log('Saved ALL_DELIVERABLES.pptx');
}

main().catch(console.error);
