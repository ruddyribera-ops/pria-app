// Render the Diapositivas PPTX content as text in a structured way for visual review
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.5;
const HEADER_H = 0.5;
const CONTENT_W = SLIDE_W - MARGIN * 2;

const COLORS = {
    primary: '#0F766E',
    primaryHover: '#0D9488',
    accent: '#FF6B6B',
    bg: '#FAFAF7',
    surface: '#F5F5F0',
    border: '#E5E5E0',
    text: '#1F2937',
    textMuted: '#6B7280',
    textLight: '#FFFFFF',
};

const SLIDES_DATA = [
    {
        tipo: 'cover',
        titulo: 'Diapositivas',
        subtitulo: 'Guede pinta los animales',
        meta: '5to Primaria · Lengua y Literatura',
    },
    {
        tipo: 'portada',
        numero: 1,
        titulo: 'Guede pinta los animales',
        meta: 'Mitos de Creación',
        ejemplo: 'Mitos ayoreo y chino',
    },
    {
        tipo: 'objetivos',
        numero: 2,
        titulo: '¿Qué aprenderemos hoy?',
        items: [
            'Comprender qué es un mito de creación',
            'Conocer el mito ayoreo de Guede',
            'Descubrir el mito chino de Panku',
            'Comparar mitos de diferentes culturas',
        ],
    },
    {
        tipo: 'concepto',
        numero: 3,
        titulo: '¿Qué es un mito?',
        items: [
            'Historia oralmente transmitida de generación en generación',
            'Explica el origen del mundo y los seres vivos',
            'Pertenece a la cultura de un pueblo',
            'Incluye personajes sobrenaturales',
        ],
    },
    {
        tipo: 'concepto',
        numero: 4,
        titulo: 'Guede pinta los animales',
        items: [
            'Mito de origen del pueblo ayoreo',
            'Guede es el creador y artista',
            'Pinta a los animales con colores especiales',
            'Cada animal tiene un significado',
        ],
    },
    {
        tipo: 'concepto',
        numero: 5,
        titulo: 'Los colores de los animales',
        items: [
            'Guede usó colores vibrantes y especiales',
            'Algunos animales fueron pintados primero',
            'Los colores representan características',
            'Por eso hay animales tan coloridos',
        ],
    },
    {
        tipo: 'pausa',
        numero: 6,
        titulo: '¡Guede nos necesita!',
        items: [
            '¡Píntate como un animal favorito!',
            'Usa gestos y movimientos del animal',
            'Comparte con un compañero',
        ],
    },
    {
        tipo: 'concepto',
        numero: 7,
        titulo: 'El mito chino de Panku',
        items: [
            'Mito de creación de la cultura china',
            'Panku surgió de un huevo cósmico',
            'Su cuerpo formó el universo',
            'Los dioses lo ayudaron a crear el mundo',
        ],
    },
    {
        tipo: 'concepto',
        numero: 8,
        titulo: 'Del huevo al universo',
        items: [
            'El huevo se rompió después de miles de años',
            'La parte superior fue el cielo',
            'La parte inferior fue la tierra',
            'Panku murió pero su cuerpo creó todo',
        ],
    },
    {
        tipo: 'concepto',
        numero: 9,
        titulo: 'El pájaro de fuego',
        items: [
            'Cuento de Oscar Alfaro',
            'Historia sobre la transformación',
            'El fuego como símbolo de renacimiento',
            'Conexión con los mitos de creación',
        ],
    },
];

async function main() {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.title = 'Diapositivas PRIA';

    SLIDES_DATA.forEach((s, idx) => {
        const slide = pptx.addSlide();
        slide.background = { color: COLORS.bg };

        if (s.tipo === 'cover') {
            // Cover slide with split layout
            slide.addShape(pptx.ShapeType.rect, {
                x: 0, y: 0, w: 3.8, h: SLIDE_H,
                fill: { color: COLORS.primary }
            });
            slide.addText('PRIA', {
                x: 0.4, y: 4.8, w: 3, h: 0.5,
                fontSize: 24, fontFace: 'Arial', bold: true,
                color: COLORS.textLight
            });
            slide.addText('Diapositivas', {
                x: 4.3, y: 1.5, w: 5, h: 1.5,
                fontSize: 60, fontFace: 'Arial', bold: true,
                color: COLORS.primary
            });
            slide.addText(s.subtitulo, {
                x: 4.3, y: 3.0, w: 5, h: 0.5,
                fontSize: 16, fontFace: 'Arial',
                color: COLORS.textMuted
            });
            slide.addText('Lunes 22 de junio de 2026', {
                x: 4.3, y: 0.4, w: 5, h: 0.3,
                fontSize: 11, fontFace: 'Arial',
                color: COLORS.textMuted, align: 'right'
            });
        } else {
            // Content slides
            // Header
            slide.addShape(pptx.ShapeType.rect, {
                x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
                fill: { color: COLORS.primary }
            });

            // Slide number badge
            slide.addText(String(s.numero), {
                x: MARGIN, y: 0, w: 0.4, h: HEADER_H,
                fontSize: 14, fontFace: 'Arial', bold: true,
                color: COLORS.textLight, valign: 'middle'
            });

            // Type badge
            slide.addShape(pptx.ShapeType.roundRect, {
                x: 0.9, y: 0.1, w: 1.3, h: 0.3,
                fill: { color: COLORS.accent }, rectRadius: 0.06
            });
            slide.addText(s.tipo.toUpperCase(), {
                x: 0.9, y: 0.1, w: 1.3, h: 0.3,
                fontSize: 9, fontFace: 'Arial', bold: true,
                color: COLORS.textLight, align: 'center', valign: 'middle'
            });

            // Title
            slide.addText(s.titulo, {
                x: 2.4, y: 0, w: 6, h: HEADER_H,
                fontSize: 18, fontFace: 'Arial', bold: true,
                color: COLORS.textLight, valign: 'middle'
            });

            // For objetivos/concepto/pausa: show items
            if (s.tipo === 'objetivos' || s.tipo === 'concepto' || s.tipo === 'pausa') {
                let y = HEADER_H + 0.4;

                // DEFINICIÓN header for concepto
                if (s.tipo === 'concepto') {
                    slide.addText('DEFINICIÓN', {
                        x: MARGIN, y, w: 2, h: 0.3,
                        fontSize: 9, fontFace: 'Arial', bold: true,
                        color: COLORS.primary, charSpacing: 2
                    });
                    y += 0.4;
                }

                s.items.forEach(item => {
                    // Bullet
                    slide.addShape(pptx.ShapeType.ellipse, {
                        x: MARGIN + 0.1, y: y + 0.15, w: 0.12, h: 0.12,
                        fill: { color: COLORS.accent }
                    });
                    slide.addText(item, {
                        x: MARGIN + 0.4, y, w: CONTENT_W - 0.5, h: 0.5,
                        fontSize: 14, fontFace: 'Arial',
                        color: COLORS.text, valign: 'top'
                    });
                    y += 0.5;
                });

                // For portada (slide 2): show example
                if (s.tipo === 'portada' && s.ejemplo) {
                    slide.addShape(pptx.ShapeType.roundRect, {
                        x: MARGIN, y: SLIDE_H - 1.5, w: CONTENT_W, h: 0.8,
                        fill: { color: COLORS.surface }, rectRadius: 0.08
                    });
                    slide.addText('EJEMPLO: ' + s.ejemplo, {
                        x: MARGIN + 0.2, y: SLIDE_H - 1.5, w: CONTENT_W - 0.4, h: 0.8,
                        fontSize: 12, fontFace: 'Arial', italic: true,
                        color: COLORS.primary, valign: 'middle'
                    });
                }
            }

            // For portada (slide 2): show meta
            if (s.tipo === 'portada' && s.meta) {
                slide.addText(s.meta, {
                    x: MARGIN, y: HEADER_H + 0.4, w: CONTENT_W, h: 0.4,
                    fontSize: 16, fontFace: 'Arial', bold: true,
                    color: COLORS.primary
                });
            }

            // Page number
            slide.addText(String(s.numero), {
                x: SLIDE_W - 0.6, y: SLIDE_H - 0.4, w: 0.3, h: 0.3,
                fontSize: 10, fontFace: 'Arial', bold: true,
                color: COLORS.textMuted, align: 'right', valign: 'middle'
            });
        }
    });

    // Add credits slide
    const creditsSlide = pptx.addSlide();
    creditsSlide.background = { color: COLORS.bg };
    creditsSlide.addText('PRIA v10', {
        x: 0, y: 1.8, w: SLIDE_W, h: 1,
        fontSize: 40, fontFace: 'Arial', bold: true,
        color: COLORS.primary, align: 'center'
    });
    creditsSlide.addText('Sistema de Planificación Docente con IA', {
        x: 0, y: 2.9, w: SLIDE_W, h: 0.5,
        fontSize: 18, fontFace: 'Arial',
        color: COLORS.textMuted, align: 'center'
    });

    await pptx.writeFile({ fileName: 'D:/Temp/opencode/verify_v6/PRIA_Diapositivas_V2.pptx' });
    console.log('Saved PRIA_Diapositivas_V2.pptx with proper visual structure');
}

main().catch(console.error);
