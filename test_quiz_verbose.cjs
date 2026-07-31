// Direct quiz test with verbose error reporting
const http = require('http');

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port: 3000, path, method,
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
  const login = await apiRequest('POST', '/api/auth/login', { usuario: 'admin', contrasena: 'admin123' });
  const token = login.data.data.token;
  
  // Test quiz with simple params
  const r = await apiRequest('POST', '/api/motores/quiz', {
    params: {
      grado_nivel: '5to Primaria',
      palabras_clave: ['Guede', 'mito'],
      tema_clase: 'Mitos y leyendas'
    }
  }, token);
  
  console.log('Status:', r.status);
  console.log('Response:', JSON.stringify(r.data, null, 2).substring(0, 2000));
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });