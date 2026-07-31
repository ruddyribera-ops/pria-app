// Verbose slides test
const http = require('http');

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: b }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const login = await api('POST', '/api/auth/login', { usuario: 'admin', contrasena: 'admin123' });
  const token = login.data.data.token;

  const r = await api('POST', '/api/motores/slides', {
    params: {
      grado_nivel: '5to Primaria',
      tema_clase: 'Guede pinta los animales',
      palabras_clave: ['Guede', 'mito', 'colores']
    }
  }, token);
  console.log('Status:', r.status);
  console.log('Response:', JSON.stringify(r.data, null, 2).substring(0, 3000));
}

main().catch(e => { console.error(e.message); process.exit(1); });