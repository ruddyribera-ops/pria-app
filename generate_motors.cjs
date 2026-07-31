// Generate fresh demo materials via API calls
const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3000;

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: API_HOST, port: API_PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Login
  console.log('1. Login...');
  const login = await apiRequest('POST', '/api/auth/login', {
    usuario: 'admin', contrasena: 'admin123'
  });
  const token = login.data.data.token;
  console.log('  Token received');

  // Generate Síntesis
  console.log('2. Generating Síntesis...');
  const syn = await apiRequest('POST', '/api/motores/synthesis', {
    params: {
      material_id: 1,
      full_text: "Los mitos son relatos antiguos. Guede pinta los animales es un mito ayoreo. Panku es el mito chino de creacion. El pajaro de fuego es un cuento sobre la bondad. La sibila adivina cuando se casara Javier en el relato del punal de plata.",
      temas: ["Guede pinta los animales", "Mito chino Panku", "Pajaro de fuego", "El punal de plata"],
      grado_nivel: "5to Primaria",
      unidad_real: "Mitos y leyendas"
    }
  }, token);
  
  if (syn.status !== 200) {
    console.log('  Síntesis FAILED:', syn.status, JSON.stringify(syn.data).substring(0, 200));
    return;
  }
  const synResult = syn.data.data.output;
  console.log('  Síntesis OK:', synResult.unidad_sintetizada.titulo);
  console.log('  Temas:', synResult.unidad_sintetizada.temas_desarrollados.map(t => t.nombre).join(', '));

  // Generate Plan
  console.log('3. Generating Plan...');
  const plan = await apiRequest('POST', '/api/motores/plan', {
    params: {
      grado_nivel: '5to Primaria',
      tema_clase: 'Guede pinta los animales',
      conceptos_clave: ['mito', 'cultura ayorea', 'colores', 'naturaleza'],
      objetivo_general: 'Comprender el mito de Guede y su significado cultural'
    }
  }, token);
  
  if (plan.status === 200) {
    console.log('  Plan OK:', plan.data.data.output?.titulo || 'no titulo');
  } else {
    console.log('  Plan FAILED:', plan.status);
  }

  // Generate Slides
  console.log('4. Generating Slides...');
  const slides = await apiRequest('POST', '/api/motores/slides', {
    params: {
      grado_nivel: '5to Primaria',
      tema_clase: 'Guede pinta los animales',
      palabras_clave: ['Guede', 'mito ayoreo', 'colores', 'Sol', 'animales']
    }
  }, token);
  
  if (slides.status === 200) {
    const slidesOut = slides.data.data.output;
    console.log('  Slides OK:', Array.isArray(slidesOut) ? slidesOut.length + ' slides' : 'no array');
  } else {
    console.log('  Slides FAILED:', slides.status, JSON.stringify(slides.data).substring(0, 200));
  }

  // Generate Quiz
  console.log('5. Generating Quiz...');
  const quiz = await apiRequest('POST', '/api/motores/quiz', {
    params: {
      grado_nivel: '5to Primaria',
      palabras_clave: ['Guede', 'mito', 'colores', 'Sol'],
      tema_clase: 'Mitos y leyendas'
    }
  }, token);
  
  if (quiz.status === 200) {
    console.log('  Quiz OK:', quiz.data.data.output?.preguntas?.length || 0, 'preguntas');
  } else {
    console.log('  Quiz FAILED:', quiz.status);
  }

  console.log('\n=== SUMMARY ===');
  console.log('All 4 motors generated successfully.');
  console.log('Now use the wizard UI to download PPTX/PDF/DOCX.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});