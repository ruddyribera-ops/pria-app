# PRIA v10 — Workflow de Imágenes para Docentes

> Sprint 2 — Fase A: Enfoque "prompt-first" para generar ilustraciones sin costo.

## ¿Por qué no generar imágenes directamente en PRIA?

Generar imágenes con IA cuesta dinero:

| Servicio | Costo por imagen | 10 slides × N temas |
|----------|------------------|----------------------|
| DALL-E 3 | $0.04 | ~$0.40 por clase |
| Midjourney | $0.10+ | ~$1.00 por clase |
| Stable Diffusion Pro | $0.02 | ~$0.20 por clase |

**Problema**: A escala (100+ clases/mes) los costos son significativos.

## Solución: Prompt-first

PRIA genera **3 variaciones de prompt optimizadas** por slide. El docente:
1. Copia el prompt al portapapeles
2. Lo pega en una herramienta **gratis**
3. Genera la imagen
4. Inserta en PowerPoint/Google Slides

**Costo total**: $0

---

## Herramientas gratuitas recomendadas

### 🥇 Microsoft Bing Image Creator (Recomendado)
- **URL**: https://www.bing.com/images/create
- **Costo**: Gratis
- **Modelo**: DALL-E 3 (mismo que PRIA pagaría)
- **Límite**: ~15 imágenes/día con cuenta Microsoft
- **Estilo PRIA**: "ilustración_infantil" optimizado para este
- **Ventaja**: Mismo modelo, mejor calidad

### 🥈 Leonardo.ai
- **URL**: https://leonardo.ai
- **Costo**: Gratis con 150 tokens/día
- **Modelo**: Leonardo Phoenix (custom)
- **Estilo PRIA**: "artistico_cultural" optimizado para este
- **Ventaja**: Mejor para estilos artísticos/culturales

### 🥉 Ideogram
- **URL**: https://ideogram.ai
- **Costo**: Gratis (con límites)
- **Modelo**: Ideogram 2.0
- **Estilo PRIA**: "fotografia_educativa" optimizado para este
- **Ventaja**: Mejor para texto en imágenes

---

## Paso a paso: Generar imágenes para una clase

### 1. En PRIA: Genera las diapositivas
```
1. Login en PRIA
2. Materiales → selecciona unidad
3. Tema → "Guede pinta los animales"
4. Click "🖼️ Generar Diapositivas"
5. Espera 30-60 segundos
```

### 2. Revisa las diapositivas
- Cada slide muestra contenido + guion docente
- Si hay ⚠️ en el badge, verifica fidelidad

### 3. Abre la Guía del docente (última página del PPTX)
- Muestra herramientas gratuitas
- Ejemplos de prompts reales

### 4. Elige slide y prompt
```
Por cada slide, PRIA genera 3 variaciones:

[Ilustración infantil - Bing]
"Children's book illustration style, Guede painting 
animals in Bolivian Chaco, warm earth tones..."

[Artístico/Cultural - Leonardo]
"Watercolor painting, indigenous Ayoreo art style..."

[Educativa/Fotográfica - Ideogram]
"Educational photograph, Bolivian landscape..."
```

### 5. Genera la imagen
```
1. Abre Bing Image Creator
2. Login con cuenta Microsoft
3. Click en el campo de texto
4. Click "Copiar prompts" en PRIA (botón verde)
5. Pega en Bing
6. Click "Crear"
7. Espera 10-30 segundos
```

### 6. Descarga y guarda
```
1. Click derecho sobre la imagen generada
2. "Guardar imagen como..."
3. Guarda en carpeta del proyecto
```

### 7. Inserta en PowerPoint
```
1. Abre tu .pptx generado por PRIA
2. Click derecho en el espacio blanco de la slide
3. "Insertar imagen"
4. Selecciona la imagen descargada
5. Ajusta tamaño/posición
```

---

## Tips para mejores resultados

### ✅ SÍ hacer
- Usar el prompt completo (no acortar)
- Agregar contexto boliviano: "Bolivian", "Chaco", "Andes", "indigenous"
- Incluir "for 5th grade" o "for 10-11 year olds"
- Especificar estilo: "children's book illustration"
- Pedir colores cálidos: "warm earth tones"

### ❌ NO hacer
- Cambiar "ayoreo" por "guaraní" u otro pueblo diferente
- Modificar el contexto cultural (es importante)
- Usar el prompt en otro idioma (PRIA optimiza para EN en las herramientas)
- Saltarse la revisión de fidelidad

---

## Para clases en cadena (varias unidades)

```
Unidad 1: 10 slides × 3 prompts = 30 prompts
Unidad 2: 10 slides × 3 prompts = 30 prompts
...

Estrategia recomendada:
- Día 1: Genera todas las slides de la unidad (PRIA)
- Día 2: Genera todas las imágenes (Bing/Leonardo)
- Día 3: Inserta y revisa
```

**Límites diarios**:
- Bing: ~15 imágenes → suficiente para 5 slides
- Leonardo: 150 tokens → ~15 imágenes
- Ideogram: ~20 imágenes

**Tip**: Si necesitas muchas imágenes, rotar entre las 3 herramientas.

---

## Alternativa: Solo texto (sin imágenes)

Si no tienes tiempo para generar imágenes, las slides de PRIA funcionan perfectamente solo con:
- Texto en pantalla (lo que ve el estudiante)
- Guion docente (lo que dices)
- Callouts (destacados)
- Iconos emoji (🎯💡🎬⭐)

Las imágenes son un **bonus visual**, no son obligatorias.

---

## Próximas versiones

**Sprint 3 (planeado)**:
- Auto-generar imágenes en background (con caché por topic)
- Marketplace de estilos visuales pre-hechos
- Bulk generation: 1 click = 60 slides con imágenes

---

## Soporte

¿Problemas con el workflow?
1. Verifica que el prompt esté completo (no cortado)
2. Prueba con otra herramienta si una falla
3. Reporta en feedback de PRIA

---

*Última actualización: Sprint 2 — Diseño visual v2*
