#!/usr/bin/env python3
"""PRIA v10 server-side PPTX generator. Reads motor JSON from stdin, writes PPTX bytes to stdout.

Usage: echo '{json}' | python pptx_gen.py > out.pptx
"""
import sys
import json
import io
import re
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

# Brand palette
COLORS = {
    'primary':    RGBColor(0x0F, 0x76, 0x6E),
    'primary_dark': RGBColor(0x0A, 0x4F, 0x4A),
    'secondary':  RGBColor(0x3A, 0x9E, 0x5E),
    'accent':     RGBColor(0xE8, 0xB7, 0x4D),
    'text':       RGBColor(0x1E, 0x1E, 0x2F),
    'text_muted': RGBColor(0x6B, 0x6B, 0x80),
    'text_light': RGBColor(0xFF, 0xFF, 0xFF),
    'bg':         RGBColor(0xFA, 0xFA, 0xF7),
    'surface':    RGBColor(0xFF, 0xFF, 0xFF),
    'border':     RGBColor(0xE5, 0xE5, 0xE0),
}


def normalize_text(s):
    """Replace latin-1 mishaps and ensure UTF-8 safe."""
    if not isinstance(s, str):
        s = str(s)
    # Replace any Unicode replacement chars just in case
    return s.replace('\ufffd', '').strip()


def add_cover_slide(prs, motor, teacher):
    """Add a cover slide with title and teacher info."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])

    # Left colored panel
    panel = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(0), Inches(0), Inches(3.5), Inches(7.5)
    )
    panel.fill.solid()
    panel.fill.fore_color.rgb = COLORS['primary']
    panel.line.fill.background()

    # Decorative circles on left panel
    for (cx, cy, r, alpha) in [(0.4, 0.4, 1.5, 0.4), (1.4, 1.4, 1.2, 0.5), (0.3, 3.5, 1.0, 0.4), (1.5, 4.4, 0.8, 0.5), (0.3, 5.0, 0.5, 0.4)]:
        circle = slide.shapes.add_shape(
            MSO_SHAPE.OVAL, Inches(cx), Inches(cy), Inches(r*2), Inches(r*2)
        )
        circle.fill.solid()
        circle.fill.fore_color.rgb = COLORS['primary']
        circle.line.fill.background()

    # PRIA branding badge
    tb = slide.shapes.add_textbox(Inches(0.4), Inches(5.4), Inches(2.6), Inches(0.5))
    tf = tb.text_frame
    tf.text = 'PRIA'
    p = tf.paragraphs[0]
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = COLORS['text_light']

    tb2 = slide.shapes.add_textbox(Inches(0.4), Inches(5.85), Inches(2.6), Inches(0.35))
    tf2 = tb2.text_frame
    tf2.text = 'Educational AI'
    p2 = tf2.paragraphs[0]
    p2.font.size = Pt(11)
    p2.font.color.rgb = COLORS['text_light']

    # Title (big)
    titles = {'slides': 'Diapositivas', 'plan': 'Plan de Clase',
              'synthesis': 'Síntesis Curricular', 'quiz': 'Pop Quiz'}
    title_text = titles.get(motor, 'Material Educativo')

    tb_title = slide.shapes.add_textbox(
        Inches(3.8), Inches(1.2), Inches(9), Inches(2)
    )
    tf_title = tb_title.text_frame
    tf_title.word_wrap = True
    tf_title.text = title_text
    p_title = tf_title.paragraphs[0]
    p_title.font.size = Pt(64)
    p_title.font.bold = True
    p_title.font.color.rgb = COLORS['primary']

    # Date top-right (Spanish)
    import datetime
    months_es = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre']
    days_es = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    now = datetime.datetime.now()
    date_str = f'{days_es[now.weekday() + 1 if now.weekday() < 6 else 0]} {now.day} de {months_es[now.month - 1]} de {now.year}'

    tb_date = slide.shapes.add_textbox(Inches(8.5), Inches(0.4), Inches(4.2), Inches(0.3))
    tf_date = tb_date.text_frame
    tf_date.text = date_str
    p_date = tf_date.paragraphs[0]
    p_date.alignment = PP_ALIGN.RIGHT
    p_date.font.size = Pt(12)
    p_date.font.color.rgb = COLORS['text_muted']

    # Teacher info block (bottom right)
    line_y = 5.6
    if isinstance(teacher, dict):
        nombre = normalize_text(teacher.get('nombre', ''))
        escuela = normalize_text(teacher.get('escuela', ''))
        ciudad = normalize_text(teacher.get('ciudad', ''))
        grado = normalize_text(teacher.get('grado', ''))
        materia = normalize_text(teacher.get('materia', ''))

        if nombre:
            tb_n = slide.shapes.add_textbox(Inches(3.8), Inches(5.6), Inches(9), Inches(0.4))
            tf_n = tb_n.text_frame
            tf_n.text = nombre
            p_n = tf_n.paragraphs[0]
            p_n.font.size = Pt(14)
            p_n.font.bold = True
            p_n.font.color.rgb = COLORS['primary']

        line_y = 6.0
        if escuela or ciudad:
            school_city = ' — '.join(filter(None, [escuela, ciudad]))
            tb_sc = slide.shapes.add_textbox(Inches(3.8), Inches(line_y), Inches(9), Inches(0.3))
            tf_sc = tb_sc.text_frame
            tf_sc.text = school_city
            p_sc = tf_sc.paragraphs[0]
            p_sc.font.size = Pt(11)
            p_sc.font.color.rgb = COLORS['text_muted']
            line_y += 0.3

        if grado or materia:
            grade_materia = ' — '.join(filter(None, [grado, materia]))
            tb_gm = slide.shapes.add_textbox(Inches(3.8), Inches(line_y), Inches(9), Inches(0.3))
            tf_gm = tb_gm.text_frame
            tf_gm.text = grade_materia
            p_gm = tf_gm.paragraphs[0]
            p_gm.font.size = Pt(11)
            p_gm.font.color.rgb = COLORS['text_muted']
            line_y += 0.3

    # Generated by badge
    badge = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(3.8), Inches(line_y + 0.1), Inches(2.2), Inches(0.35)
    )
    badge.fill.solid()
    badge.fill.fore_color.rgb = COLORS['accent']
    badge.line.fill.background()

    tb_badge = slide.shapes.add_textbox(
        Inches(3.8), Inches(line_y + 0.1), Inches(2.2), Inches(0.35)
    )
    tf_badge = tb_badge.text_frame
    tf_badge.text = 'Generado por IA'
    p_badge = tf_badge.paragraphs[0]
    p_badge.alignment = PP_ALIGN.CENTER
    p_badge.font.size = Pt(10)
    p_badge.font.bold = True
    p_badge.font.color.rgb = COLORS['text_light']


def add_content_slide(prs, title, body_text=None, bullet_points=None):
    """Add a generic content slide."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])

    # Header bar
    header = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(0), Inches(0), Inches(13.333), Inches(1)
    )
    header.fill.solid()
    header.fill.fore_color.rgb = COLORS['primary']
    header.line.fill.background()

    tb_h = slide.shapes.add_textbox(
        Inches(0.5), Inches(0.2), Inches(11), Inches(0.6)
    )
    tf_h = tb_h.text_frame
    tf_h.text = normalize_text(title)
    p_h = tf_h.paragraphs[0]
    p_h.font.size = Pt(24)
    p_h.font.bold = True
    p_h.font.color.rgb = COLORS['text_light']

    tb_b = slide.shapes.add_textbox(
        Inches(0.5), Inches(1.5), Inches(12.3), Inches(5)
    )
    tf_b = tb_b.text_frame
    tf_b.word_wrap = True
    if body_text:
        tf_b.text = normalize_text(body_text)
        p_b = tf_b.paragraphs[0]
        p_b.font.size = Pt(18)
        p_b.font.color.rgb = COLORS['text']
    elif bullet_points:
        for i, point in enumerate(bullet_points):
            if i == 0:
                p = tf_b.paragraphs[0]
            else:
                p = tf_b.add_paragraph()
            p.text = f'• {normalize_text(point)}'
            p.font.size = Pt(18)
            p.font.color.rgb = COLORS['text']
            p.space_after = Pt(8)

    # Page footer
    tb_f = slide.shapes.add_textbox(Inches(0.5), Inches(7.0), Inches(12.3), Inches(0.3))
    tf_f = tb_f.text_frame
    tf_f.text = 'PRIA v10 — Plataforma de Planificación con IA'
    p_f = tf_f.paragraphs[0]
    p_f.alignment = PP_ALIGN.CENTER
    p_f.font.size = Pt(9)
    p_f.font.italic = True
    p_f.font.color.rgb = COLORS['text_muted']


def render_slides_motor(prs, output, teacher):
    """Render slides from slides motor output."""
    if isinstance(output, list):
        slide_items = output
    elif isinstance(output, dict) and 'slides' in output:
        slide_items = output['slides']
    else:
        slide_items = []

    if not slide_items:
        add_content_slide(prs, 'Sin contenido', body_text='No se generaron diapositivas.')
        return

    for item in slide_items:
        if not isinstance(item, dict):
            continue
        titulo = item.get('titulo', 'Sin título')
        texto = item.get('texto_pantalla', '') or item.get('texto', '')
        guion = item.get('guion_docente', '')

        # Combine body
        body = texto if texto else guion
        if not body:
            body = item.get('content', '') or item.get('body', '')
        add_content_slide(prs, titulo, body_text=body)


def render_plan_motor(prs, output, teacher):
    if isinstance(output, dict) and 'secuencia_didactica' in output:
        bloques = output['secuencia_didactica'].get('bloques', [])
    else:
        bloques = []
    if not bloques:
        add_content_slide(prs, 'Plan', body_text='No se generó plan.')
        return
    for bloque in bloques:
        titulo = f"{bloque.get('nombre', 'Bloque')} ({bloque.get('duracion', '?')} min)"
        body = f"Objetivo: {bloque.get('objetivo', '')}\n\nActividad: {bloque.get('actividad', '')}"
        add_content_slide(prs, titulo, body_text=body)


def render_synthesis_motor(prs, output, teacher):
    if isinstance(output, dict) and 'unidad_sintetizada' in output:
        temas = output['unidad_sintetizada'].get('temas_desarrollados', [])
    else:
        temas = []
    if not temas:
        add_content_slide(prs, 'Síntesis', body_text='No se generó síntesis.')
        return
    for tema in temas:
        nombre = tema.get('nombre', 'Tema')
        conceptos = tema.get('conceptos_clave', [])
        add_content_slide(prs, nombre, bullet_points=conceptos)


def render_quiz_motor(prs, output, teacher):
    if isinstance(output, dict) and 'quiz' in output:
        preguntas = output['quiz'].get('preguntas', [])
    else:
        preguntas = []
    if not preguntas:
        add_content_slide(prs, 'Quiz', body_text='No se generó quiz.')
        return
    for pregunta in preguntas:
        titulo = f"Pregunta {pregunta.get('numero', '?')}"
        body = pregunta.get('pregunta', '')
        opciones = pregunta.get('opciones', [])
        if opciones:
            body += '\n\nOpciones:\n' + '\n'.join(f'  {chr(97+i)}) {op}' for i, op in enumerate(opciones))
        add_content_slide(prs, titulo, body_text=body)


MOTOR_RENDERERS = {
    'slides': render_slides_motor,
    'plan': render_plan_motor,
    'synthesis': render_synthesis_motor,
    'quiz': render_quiz_motor,
}


def main():
    payload = json.loads(sys.stdin.buffer.read().decode('utf-8-sig'))
    motor = payload.get('motor', 'slides')
    output = payload.get('output', {})
    teacher = payload.get('teacherInfo') or {}
    if not isinstance(teacher, dict):
        teacher = {}

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # 1. Cover slide
    add_cover_slide(prs, motor, teacher)

    # 2. Motor-specific content
    renderer = MOTOR_RENDERERS.get(motor)
    if renderer:
        renderer(prs, output, teacher)
    else:
        add_content_slide(prs, f'Motor: {motor}', body_text=json.dumps(output, ensure_ascii=False)[:500])

    # Write to stdout
    buf = io.BytesIO()
    prs.save(buf)
    sys.stdout.buffer.write(buf.getvalue())


if __name__ == '__main__':
    main()
