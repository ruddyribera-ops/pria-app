# PRIA v5.5 — Guía de Configuración del Motor de Diapositivas

## Archivos nuevos / actualizados en esta versión

Coloca todos estos archivos en tu carpeta `PRIA v3/`:

```
PRIA v3/
├── app_ui.py              ← actualizado
├── exportar.py            ← actualizado  
├── slide_generator.py     ← NUEVO
├── Motor_M1b.txt          ← actualizado (mueve a prompts_maestros/)
├── logo_laspalmas.png     ← sin cambios
├── logo_b64.txt           ← NUEVO
└── .streamlit/
    └── secrets.toml       ← actualiza con ANTHROPIC_API_KEY
```

---

## Paso 1 — Instalar pptxgenjs (una sola vez)

Abre una terminal y ejecuta:

```bash
npm install -g pptxgenjs
```

Verifica que funcionó:

```bash
node -e "require('pptxgenjs'); console.log('OK')"
```

---

## Paso 2 — Agregar la Anthropic API Key

Edita `.streamlit/secrets.toml` y agrega:

```toml
ANTHROPIC_API_KEY = "sk-ant-..."
```

Obtén tu clave en: https://console.anthropic.com

El modelo usado es `claude-sonnet-4-6`.
Costo aproximado: **$0.06 por presentación** (muy bajo).

---

## Paso 3 — Mover Motor_M1b.txt

Mueve el archivo `Motor_M1b.txt` a tu carpeta de prompts:

```
PRIA v3/prompts_maestros/Motor_M1b.txt
```

(Reemplaza el archivo anterior)

---

## Cómo funciona el nuevo motor de diapositivas

```
Usuario genera M1b en PRIA
         ↓
M1b JSON con 10 slides + prompts de imagen mejorados
         ↓
Panel de Exportación → botón "✨ Generar Diapositivas"
         ↓
Claude API (claude-sonnet-4-6) recibe el JSON
         ↓
Claude escribe código pptxgenjs completo (JS)
         ↓
Node.js ejecuta el JS en tu máquina
         ↓
.pptx de alta calidad listo para descargar
```

---

## Mejoras en los prompts de imagen (Motor_M1b.txt)

El nuevo sistema de prompts tiene tres partes fijas:

**PARTE 1 — Prefijo de estilo** (idéntico en todas las slides):
Bloquea: estilo de ilustración, paleta de colores, técnica artística.
Garantiza que todas las imágenes del mazo sean visualmente consistentes.

**PARTE 2 — Escena específica** (generada por M1b):
Una acción visual concreta que enseña el concepto.
Ya no más "estudiante leyendo" — ahora "niño sacando puntos gigantes brillantes de un libro".

**PARTE 3 — Sufijo técnico** (idéntico en todas las slides):
Sin texto en las imágenes, sin marcos, sin marcas de agua.

---

## Fallback

Si Node.js no está disponible o falta la API key de Anthropic,
el sistema usa automáticamente el motor python-pptx como respaldo.
La presentación se genera igualmente, con menor calidad visual.

---

## Solución de problemas

**"Node.js not found"**
→ Instala Node desde https://nodejs.org y reinicia la app.

**"Cannot find module 'pptxgenjs'"**
→ Ejecuta: `npm install -g pptxgenjs`

**"ANTHROPIC_API_KEY not found"**
→ Verifica que secrets.toml tiene la clave y reinicia Streamlit.

**El JS generado tiene errores**
→ Revisa el archivo `debug_last_slides.js` en la carpeta PRIA v3/.
   Puedes ejecutarlo manualmente: `node debug_last_slides.js test.pptx`
