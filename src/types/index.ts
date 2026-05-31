// ===== Auth Types =====
export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  nombre: string;
  role: string;
  nivel: string;
  grado: string;
  student_book?: number;
  teacher_code?: string;
}

// ===== User Management =====
export interface UsuarioResponse {
  id: number;
  username: string;
  nombre: string;
  role: string;
  nivel: string;
  grado: string;
  created_at: string;
  usuario?: string;
  correo?: string;
  rol?: string;
  estado?: boolean;
  teacher_code?: string;
}

export interface UsuarioCreate {
  username: string;
  nombre: string;
  role: string;
  password: string;
  nivel?: string;
  grado?: string;
  teacher_code?: string;
}

export interface UsuarioUpdate {
  nombre?: string;
  correo?: string;
  rol?: string;
  estado?: boolean;
}

// ===== Blocks =====
export interface BloqueResponse {
  id: number;
  teacher_code: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
  materia?: string | null;
  nivel_grado?: string | null;
  ubicacion?: string | null;
  orden?: number;
  created_at: string;
}

export interface BloqueCreate {
  teacher_code: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
  materia?: string | null;
  nivel_grado?: string | null;
  ubicacion?: string | null;
}

export interface BloqueUpdate {
  dia?: string;
  hora_inicio?: string;
  hora_fin?: string;
  tipo?: string;
  materia?: string | null;
  nivel_grado?: string | null;
  ubicacion?: string | null;
}

// ===== Materials =====
export interface Material {
  id: number;
  filename: string;
  tipo: string;
  size?: number;
  created_at?: string;
}

// ===== Diagnosticos =====
export interface Diagnostico {
  id: number;
  estudiante: string;
  nivel: string;
  area?: string;
  fecha?: string;
  resultado?: string;
  created_at?: string;
  filename?: string;
  tipo?: string;
  size?: number;
}

// ===== System Status =====
export interface EstadoSistema {
  motors: Record<string, string>;
  lastUpdated: string;
}

// ===== Schedule =====
export interface ScheduleEntry {
  hora: string;
  materia: string;
  grado: string;
  nivel: string;
  docente: string;
  tipo?: string;
}

// Raw DB row from /schedule endpoint
export interface ScheduleBloqueRow {
  teacher_code: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  tipo?: string;
  materia: string;
  nivel_grado: string;
}

// ===== Form State =====
export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };