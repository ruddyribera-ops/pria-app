import type { LoginRequest, TokenResponse, UserInfo } from '../types';
import client from './client';

// Backend expects { usuario, contrasena } — translate from { username, password }
function toApiPayload(data: LoginRequest): Record<string, string> {
  return {
    usuario: data.username,
    contrasena: data.password,
  };
}

function mockLogin(data: LoginRequest): TokenResponse {
  // Mock fallback: admin / cualquier-contrasena — only for dev/demo when API is unavailable
  const isAdmin = data.username?.toLowerCase() === 'admin';
  return {
    token: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user: {
      id: isAdmin ? 1 : Math.floor(Math.random() * 1000) + 100,
      nombre: isAdmin ? 'Administrador' : (data.username || 'Docente'),
      role: isAdmin ? 'admin' : 'docente',
      nivel: isAdmin ? 'primaria' : 'secundaria',
      grado: isAdmin ? '6to' : '3ro',
      teacher_code: isAdmin ? 'ADMIN' : data.username?.toUpperCase() || 'DOCENTE',
    },
  };
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  try {
    const response = await client.post<{ data: TokenResponse }>('/auth/login', toApiPayload(data));
    return response.data.data;
  } catch (err) {
    // Only fall back to mock for network/connection errors, not auth failures
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      // Real auth failure — throw it, don't mock
      throw err;
    }
    // Network error or server down — use mock for dev/demo
    if (import.meta.env.DEV) {
      console.warn('[Auth] API unavailable, using mock login:', err);
      return mockLogin(data);
    }
    throw err;
  }
}

export async function getMe(): Promise<UserInfo> {
  try {
    const response = await client.get<{ data: UserInfo }>('/auth/me');
    return response.data.data;
  } catch {
    // Fallback: reconstruct from localStorage user
    try {
      const raw = localStorage.getItem('pria_user');
      if (raw) return JSON.parse(raw) as UserInfo;
    } catch {
      // localStorage read/parse failed — treat as no session
    }
    throw new Error('Sesión no válida. Inicia sesión nuevamente.');
  }
}