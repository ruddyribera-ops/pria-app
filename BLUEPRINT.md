# PRIA v5.4 — Blueprint de Reconstrucción React

> **Basado en:** API real en `https://steadfast-alignment-production.up.railway.app/`  
> **Framework:** FastAPI + PostgreSQL + JWT + MiniMax M2.7  
> **Frontend objetivo:** React 19 + Vite + TypeScript  
> **Fecha:** 2026-05-13

---

## 📡 1. API BASE

```
Base URL: https://steadfast-alignment-production.up.railway.app
Auth: JWT Bearer Token (Authorization: Bearer <token>)
Login espera: { usuario: string, contrasena: string }
```

---

## 📦 2. MODELOS DE DATOS (desde el contrato API)

```typescript
// ── AUTH ──
interface LoginRequest {
  usuario: string;     // "admin"
  contrasena: string;  // "2b0n2b!123"
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;  // "bearer"
}

interface UserResponse {
  id: number;
  usuario: string;
  nombre: string;
  rol: string;          // "admin" | "teacher" | "viewer"
  correo?: string;
  teacher_code?: string; // "ADMIN"
  estado: boolean;
}

// ── SCHEDULE ──
interface ScheduleBlock {
  id: number;
  teacher_code: string;  // "ADMIN"
  dia: string;           // "LUNES" | "MARTES" | ...
  hora_inicio: string;   // "07:30"
  hora_fin: string;      // "08:20"
  tipo: string;          // "clase" | "recreo" | ...
  materia?: string;      // "Matemáticas"
  nivel_grado?: string;  // "3er año"
  ubicacion?: string;    // "Aula 101"
  orden?: number;
  created_at: string;
}

// ── MATERIALS ──
interface Material {
  id: number;
  teacher_code: string;
  tipo: string;          // "textbook" | "student_book"
  filename: string;
  filepath: string;
  created_at: string;
}

// ── DIAGNOSTICOS ──
interface Diagnostico {
  id: number;
  teacher_code: string;
  tipo: string;          // "medical" | "psychological" | ...
  filename: string;
  filepath: string;
  created_at: string;
}

// ── USERS (admin) ──
interface UsuarioCreate {
  usuario: string;
  nombre: string;
  rol: string;
  correo?: string;
  teacher_code?: string;
  contrasena: string;
}

interface UsuarioResponse {
  id: number;
  usuario: string;
  nombre: string;
  rol: string;
  correo?: string;
  teacher_code?: string;
  estado: boolean;
  created_at: string;
}

// ── ESTADO SISTEMA ──
interface EstadoSistema {
  // 7 motores con estado: "pending" | "generating" | "done" | "error"
  sintesis_unidad: string;
  proyecto_abp: string;
  plan_clase: string;
  diapositivas: string;
  ficha_gamificada: string;
  pop_quiz: string;
  guia_tutor: string;
}

// ── CACHE ──
interface CacheStats {
  entries: number;
  motores_cache: number;
  pdfs_cache: number;
}

// ── MOTORES (AI requests) ──
interface MotorSynthesisRequest {
  grado_nivel: string;
  unidad: string;
  temas: string;
  diagnosticos: string;
}

interface MotorPlanRequest {
  grado_nivel: string;
  tema_clase: string;
  conceptos_clave: string;
  palabras_clave: string;
  inteligencias_sugeridas: string;
  diagnosticos: string;
  objetivo_general: string;
  pag_tb?: string;
  pag_sb?: string;
  user_suggestions?: string;
}

interface MotorSlidesRequest {
  grado_nivel: string;
  plan_estrategico_json: string;
  diagnosticos: string;
  pag_tb?: string;
  pag_sb?: string;
  palabras_clave?: string;
  personaje_genero?: string;  // "ambos" | "masculino" | "femenino"
  user_suggestions?: string;
}

interface MotorFichaRequest {
  grado_nivel: string;
  plan_estrategico_json: string;
  diagnosticos: string;
  conceptos_clave: string;
  palabras_clave: string;
  user_suggestions?: string;
}

interface MotorQuizRequest {
  grado_nivel: string;
  plan_estrategico_json: string;
  palabras_clave: string;
  proyecto_pbl?: string;
  diagnosticos?: string;
  user_suggestions?: string;
}

interface MotorPdcRequest {
  grado: string;
  seccion: string;
  materia: string;
  trimestre: number;
  ano_escolar: string;
  objetivos: string;
  contenidos: string;
  actividades: string;
  recursos: string;
  evaluacion: string;
  adaptaciones?: string;
  bibliografia?: string;
}
```

---

## 🧭 3. ARQUITECTURA DEL FRONTEND

### 3.1 Stack Propuesto
```
React 19 + TypeScript
Vite 8 (build tool)
React Router 7 (routing)
Axios (HTTP client)
CSS Modules o Tailwind (styling)
```

### 3.2 Estructura de Archivos
```
src/
├── api/
│   ├── client.ts          # Axios instance con JWT interceptor
│   ├── auth.ts            # login(), logout(), refresh(), me()
│   ├── schedule.ts        # getSchedule(), getScheduleByDay()
│   ├── blocks.ts          # CRUD bloques
│   ├── materials.ts       # list, upload, delete materials
│   ├── diagnosticos.ts    # list, upload, delete diagnosticos
│   ├── users.ts           # CRUD usuarios (admin)
│   ├── admin.ts           # reset-day, cache, estado-sistema
│   └── motores.ts         # synthesis, plan, slides, ficha, quiz, pdc
│
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx     # Navegación lateral
│   │   ├── Header.tsx      # Top bar con usuario + logout
│   │   └── AppLayout.tsx   # Sidebar + Header + main content
│   ├── Auth/
│   │   ├── ProtectedRoute.tsx
│   │   └── LoginForm.tsx
│   ├── Schedule/
│   │   ├── ScheduleTable.tsx
│   │   ├── DaySelector.tsx
│   │   └── TeacherSelector.tsx
│   ├── Blocks/
│   │   ├── BlockList.tsx
│   │   ├── BlockForm.tsx
│   │   └── BlockCard.tsx
│   ├── Motores/
│   │   ├── MotorForm.tsx    # Formulario genérico para motores
│   │   ├── MotorResult.tsx  # Display de resultado
│   │   └── MotorStatus.tsx  # Indicador de estado
│   ├── Materials/
│   │   ├── FileUpload.tsx   # Componente de subida reutilizable
│   │   └── FileList.tsx
│   ├── Users/
│   │   ├── UserTable.tsx
│   │   └── UserForm.tsx
│   └── UI/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── ProgressBar.tsx
│       └── StatusBadge.tsx
│
├── pages/
│   ├── LoginPage.tsx
│   ├── DiarioPage.tsx       # Vista del día
│   ├── SemanalPage.tsx      # Vista semanal + generación
│   ├── TrimestralPage.tsx   # Planificación trimestral + PDC
│   ├── MaterialesPage.tsx   # Subida de libros de texto
│   ├── DiagnosticosPage.tsx # Subida de diagnósticos
│   ├── AdminPage.tsx        # Panel admin con tabs
│   └── NotFoundPage.tsx
│
├── hooks/
│   ├── useAuth.ts
│   └── useSchedule.ts
│
├── context/
│   └── AuthContext.tsx
│
├── types/
│   └── index.ts            # Todos los tipos TypeScript
│
├── App.tsx                 # Router principal
└── main.tsx                # Entry point
```

---

## 🗺️ 4. RUTAS DEL FRONTEND

| Ruta | Página | Auth | API Calls |
|------|--------|------|-----------|
| `/login` | LoginPage | No | `POST /api/auth/login` |
| `/diario` | DiarioPage | Sí | `GET /api/schedule/{code}/{dia}`, `GET /api/admin/estado-sistema` |
| `/semanal` | SemanalPage | Sí | `GET /api/schedule/{code}`, `POST /api/motores/synthesis/`, `POST /api/motores/plan/`, `POST /api/motores/slides/`, `POST /api/motores/ficha/`, `POST /api/motores/quiz/` |
| `/trimestral` | TrimestralPage | Sí | `POST /api/motores/pdc/` |
| `/materiales` | MaterialesPage | Sí | `GET/POST/DELETE /api/materials/` |
| `/diagnosticos` | DiagnosticosPage | Sí | `GET/POST/DELETE /api/diagnosticos/` |
| `/admin` | AdminPage | Sí (admin) | CRUD `/api/users/`, `POST /api/admin/reset-day`, `GET/POST /api/admin/cache/`, `GET /api/admin/estado-sistema`, CRUD `/api/blocks/` |

---

## 🎨 5. WIREFRAMES DE CADA PÁGINA

### 5.1 LoginPage
```
┌─────────────────────────────────────┐
│  🔐 Acceso al Sistema PRIA          │
│  Ingresa con tu usuario o correo    │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Usuario o correo                ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Contraseña                      ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │          Ingresar               ││
│  └─────────────────────────────────┘│
│                                     │
│  © 2026 PRIA • Método Palma-Ribera  │
└─────────────────────────────────────┘
```

### 5.2 AppLayout (con sidebar)
```
┌──────────┬──────────────────────────────────────┐
│ SIDEBAR  │  HEADER: PRIA v5.4 • [Page]          │
│          ├──────────────────────────────────────┤
│ 👤 Perfil│                                      │
│   Admin  │         MAIN CONTENT                 │
│          │                                      │
│ 📅 Diario│                                      │
│ 📅 Semanal│                                     │
│ 📆 Trimes│                                      │
│  ─────── │                                      │
│ 📥 Mater │                                      │
│ 🩺 Diagn │                                      │
│  ─────── │                                      │
│ 📊 Admin │                                      │
│          │                                      │
│ ──────── │                                      │
│ 🧹Reinic │                                      │
│ 🚪Cerrar │                                      │
└──────────┴──────────────────────────────────────┘
```

### 5.3 DiarioPage (Vista del Día)
```
┌────────────────────────────────────────────────┐
│  PRIA v5.4 • Diario                👤 (ADMIN)   │
├────────────────────────────────────────────────┤
│  [🌅 Diario]  [📅 Semanal]  [📆 Trimestral]    │
├────────────────────────────────────────────────┤
│  ⬅ Ayer  │  📅 miércoles, 13 may 2026  │ ➡ Mañana│
├────────────────────────────────────────────────┤
│  👤 Ver horario de: [ADMIN        ▾]           │
├────────────────────────────────────────────────┤
│  Tu Ruta del Día                                │
│  Miércoles, 13 de mayo — SEMANA 15             │
│  Día 66 / 66  ████████████░░░░░  0%            │
├────────────────────────────────────────────────┤
│  HORA       │ MATERIA   │ GRADO │ NIVEL │ DOC. │
│  ────────── │ ────────  │ ───── │ ───── │ ──── │
│  07:30-08:20│ Matemát.  │ 3er   │ Sec.  │ García│
│  08:20-09:10│ Lenguaje  │ 3er   │ Sec.  │ López │
│  09:10-10:00│ C. Natur. │ 3er   │ Sec.  │ Martínez│
│  10:00-10:30│ Recreo    │ -     │ -     │ -     │
│  10:30-11:20│ Historia  │ 3er   │ Sec.  │ Rodr. │
│  ...        │           │       │       │       │
└────────────────────────────────────────────────┘
```

### 5.4 AdminPage (Panel de Administración)
```
┌────────────────────────────────────────────────┐
│  PRIA v5.4 • Admin             👤 (ADMIN)       │
├────────────────────────────────────────────────┤
│  ⚙️ Panel de Administración                    │
├────────────────────────────────────────────────┤
│  [📂 Archivos]  [👥 Usuarios]  [🌅 Reset]  [✏️ Bloques]│
├────────────────────────────────────────────────┤
│                                                │
│  ── TAB: GESTIÓN DE USUARIOS ──               │
│  ┌────────────────────────────────────────┐    │
│  │ ID │ USUARIO │ ROL   │ ESTADO │ ACCION │    │
│  ├────┼─────────┼───────┼────────┼────────┤    │
│  │ 1  │ admin   │ admin │ Activo │ ✏️ 🗑  │    │
│  │ 2  │ profesor│ teach │ Activo │ ✏️ 🗑  │    │
│  └────┴─────────┴───────┴────────┴────────┘    │
│  ┌─ Crear Usuario ────────────────────────┐    │
│  │ Usuario: [    ]  Nombre: [         ]   │    │
│  │ Correo:  [    ]  Rol:    [teach    ▾]  │    │
│  │ Contraseña: [    ]  Código: [      ]   │    │
│  │                         [Crear usuario] │    │
│  └────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

### 5.5 SemanalPage
```
┌────────────────────────────────────────────────┐
│  PRIA v5.4 • Semanal                           │
├────────────────────────────────────────────────┤
│  [🌅 Diario]  [📅 Semanal]  [📆 Trimestral]    │
├────────────────────────────────────────────────┤
│  Nivel: [Primaria ▾]  Grado: [5to ▾]  Materia: [Matemáticas ▾] │
│  Páginas del libro de texto: [   ]             │
│                                        [Generar Plan] │
├────────────────────────────────────────────────┤
│  Día 1/132  ███░░░░░░░░░░░░░░  0%              │
├────────────────────────────────────────────────┤
│  LUNES │ MARTES │ MIÉRCOLES │ JUEVES │ VIERNES │
│  ───── │ ────── │ ───────── │ ────── │ ─────── │
│  [Plan]│        │           │        │         │
│  [Diap]│        │           │        │         │
│  [Fich]│        │           │        │         │
│  [Quiz]│        │           │        │         │
└────────────────────────────────────────────────┘
```

### 5.6 TrimestralPage
```
┌────────────────────────────────────────────────┐
│  PRIA v5.4 • Trimestral                        │
├────────────────────────────────────────────────┤
│  [🌅 Diario]  [📅 Semanal]  [📆 Trimestral]    │
├────────────────────────────────────────────────┤
│  [Plan de Unidad y ABP]  [PDC Trimestral]      │
├────────────────────────────────────────────────┤
│  Nivel:  [Primaria ▾]                          │
│  Grado:  [5to ▾]                               │
│  Materia:[Matemáticas ▾]                       │
│  Sugerencias (opcional):                       │
│  [                                        ]    │
│  ☑ Incluir Aprendizaje Basado en Problemas     │
│                                        [Generar Planificación] │
└────────────────────────────────────────────────┘
```

### 5.7 MaterialesPage
```
┌────────────────────────────────────────────────┐
│  PRIA v5.4 • Materiales                        │
├────────────────────────────────────────────────┤
│  📗 Libro de Texto (PDF)                       │
│  ┌────────────────────────────────────────┐    │
│  │  [Arrastra archivo o] [Upload]         │    │
│  │  500MB per file • PDF                  │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  📘 ¿Usa Student Book?   ○ No  ● Sí            │
│                                                │
│  Archivos subidos:                             │
│  ┌────────────────────────────────────────┐    │
│  │ 📄 libro_matematicas_5to.pdf    🗑     │    │
│  └────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

### 5.8 DiagnosticosPage
```
┌────────────────────────────────────────────────┐
│  PRIA v5.4 • Diagnósticos                      │
├────────────────────────────────────────────────┤
│  🩺 Diagnósticos                               │
│                                                │
│  Archivos (PDF, DOCX, TXT):                    │
│  ┌────────────────────────────────────────┐    │
│  │  [Arrastra archivo o] [Upload]         │    │
│  │  500MB per file • PDF, DOCX, TXT       │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  Sin archivos cargados.                        │
└────────────────────────────────────────────────┘
```

---

## 🔐 6. FLUJO DE AUTENTICACIÓN

```
1. User visita /login
2. Ingresa usuario + contraseña
3. POST /api/auth/login { usuario, contrasena }
4. Backend valida contra PostgreSQL, devuelve JWT
5. Frontend guarda token en localStorage/httpOnly cookie
6. Axios interceptor agrega Authorization: Bearer <token> a todas las requests
7. ProtectedRoute verifica token antes de renderizar cada página
8. Token expirado → redirect a /login
9. POST /api/auth/refresh para renovar token
```

---

## 📋 7. COMPONENTES DEL SIDEBAR

```
┌────────────────────────┐
│ 👤 Perfil Docente      │ ← Muestra nombre + rol
│   Administrador        │
│   admin@laspalmas.edu  │
│                        │
│ 📅 Diario              │ ← /diario (default)
│ 📅 Semanal             │ ← /semanal
│ 📆 Trimestral          │ ← /trimestral
│ ─────────────────────  │
│ 📥 Materiales          │ ← /materiales
│ 🩺 Diagnósticos        │ ← /diagnosticos
│ ─────────────────────  │
│ ⚙️ Admin               │ ← /admin (solo rol=admin)
│                        │
│ ─────────────────────  │
│ 🧹 Reiniciar Todo      │ ← POST /api/admin/reset-day
│ 🚪 Cerrar Sesión       │ ← POST /api/auth/logout
└────────────────────────┘
```

---

## ⚡ 8. API ENDPOINTS — MAPEO COMPLETO

### Auth
| Method | Endpoint | Body/Params | Response | Página |
|--------|----------|-------------|----------|--------|
| POST | `/api/auth/login` | `{usuario, contrasena}` | `TokenResponse` | Login |
| POST | `/api/auth/refresh` | `{refresh_token}` | `TokenResponse` | - |
| POST | `/api/auth/logout` | - | 200 | - |
| GET | `/api/auth/me` | Header: `Authorization` | `UserResponse` | Sidebar |

### Schedule
| Method | Endpoint | Params | Response | Página |
|--------|----------|--------|----------|--------|
| GET | `/api/schedule/{teacher_code}` | path | `ScheduleBlock[]` | Semanal |
| GET | `/api/schedule/{teacher_code}/{dia}` | path | `ScheduleBlock[]` | Diario |

### Blocks (CRUD)
| Method | Endpoint | Body | Response | Página |
|--------|----------|------|----------|--------|
| GET | `/api/blocks/` | - | `BloqueResponse[]` | Admin |
| POST | `/api/blocks/` | `BloqueCreate` | `BloqueResponse` | Admin |
| PUT | `/api/blocks/{id}` | `BloqueUpdate` | `BloqueResponse` | Admin |
| DELETE | `/api/blocks/{id}` | - | 204 | Admin |

### Materials
| Method | Endpoint | Params | Response | Página |
|--------|----------|--------|----------|--------|
| GET | `/api/materials/` | - | `Material[]` | Materiales |
| POST | `/api/materials/upload` | query: `tipo`, body: file | 200 | Materiales |
| DELETE | `/api/materials/{id}` | - | 204 | Materiales |

### Diagnosticos
| Method | Endpoint | Params | Response | Página |
|--------|----------|--------|----------|--------|
| GET | `/api/diagnosticos/` | - | `Diagnostico[]` | Diagnosticos |
| POST | `/api/diagnosticos/upload` | query: `tipo`, body: file | 200 | Diagnosticos |
| DELETE | `/api/diagnosticos/{id}` | - | 204 | Diagnosticos |

### Export
| Method | Endpoint | Body | Response | Página |
|--------|----------|------|----------|--------|
| POST | `/api/export/generate` | `{export_type, data}` | DOCX | Semanal/Trimestral |
| GET | `/api/export/{type}` | path | file | Semanal/Trimestral |

### Users (Admin)
| Method | Endpoint | Body | Response | Página |
|--------|----------|------|----------|--------|
| GET | `/api/users/` | - | `UsuarioResponse[]` | Admin |
| POST | `/api/users/` | `UsuarioCreate` | `UsuarioResponse` | Admin |
| GET | `/api/users/{id}` | - | `UsuarioResponse` | Admin |
| PUT | `/api/users/{id}` | `UsuarioUpdate` | `UsuarioResponse` | Admin |
| DELETE | `/api/users/{id}` | - | 204 | Admin |

### Admin
| Method | Endpoint | Body | Response | Página |
|--------|----------|------|----------|--------|
| POST | `/api/admin/reset-day` | `{teacher_code}` | 200 | Admin/Reset |
| GET | `/api/admin/cache/stats` | - | `CacheStats` | Admin/Cache |
| POST | `/api/admin/cache/clear` | - | 200 | Admin/Cache |
| GET | `/api/admin/estado-sistema` | - | `EstadoSistema` | Diario/Admin |

### Motores (AI)
| Method | Endpoint | Body | Response | Página |
|--------|----------|------|----------|--------|
| POST | `/api/motores/synthesis/` | `MotorSynthesisRequest` | 200 (async) | Semanal |
| POST | `/api/motores/plan/` | `MotorPlanRequest` | 200 (async) | Semanal |
| POST | `/api/motores/slides/` | `MotorSlidesRequest` | 200 (async) | Semanal |
| POST | `/api/motores/ficha/` | `MotorFichaRequest` | 200 (async) | Semanal |
| POST | `/api/motores/quiz/` | `MotorQuizRequest` | 200 (async) | Semanal |
| POST | `/api/motores/pdc/` | `MotorPdcRequest` | 200 (async) | Trimestral |

### Health
| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/health` | `{status, version}` |

---

## 🏗️ 9. PLAN DE CONSTRUCCIÓN (orden)

### Fase 1 — Fundación (1-2 hrs)
```
1. Scaffold React + Vite + TypeScript
2. Axios client con interceptor JWT
3. AuthContext + ProtectedRoute
4. LoginPage
5. AppLayout + Sidebar
```

### Fase 2 — Páginas Core (2-3 hrs)
```
6. DiarioPage (schedule del día, selector de fecha, selector de docente)
7. SemanalPage (schedule semanal, generación de planes)
8. TrimestralPage (planificación trimestral + PDC)
```

### Fase 3 — Features (2 hrs)
```
9. MaterialesPage (file upload)
10. DiagnosticosPage (file upload)
11. AdminPage (tabs: users, blocks, reset, cache)
```

### Fase 4 — Motores AI (2-3 hrs)
```
12. Integrar llamadas a /api/motores/* en SemanalPage
13. Estado del Sistema en DiarioPage
```

### Fase 5 — Polish (1 hr)
```
14. Loading states, errores, empty states
15. Responsive
16. Deploy a Railway
```

---

## ⚠️ 10. NOTAS CRÍTICAS

1. **Login espera `usuario` y `contrasena`** (no `username`/`password`)
2. **Token refresh** implementado para sesiones largas
3. **File uploads** multipart/form-data con query param `tipo`
4. **Motores son async** — el frontend debe mostrar estado "generating..." y polling
5. **Admin pages requieren rol=admin** — validar en frontend y API
6. **Cache stats/motores/pdfs** se limpian por separado (POST /api/admin/cache/clear)
7. **Reset day** reinicia todos los estados de motor a "pending"
8. **Estado del sistema** se consulta con GET /api/admin/estado-sistema

---

*Blueprint generado desde la API real en `steadfast-alignment-production.up.railway.app` — 2026-05-13*
*Nada inventado. Solo lo que la API expone.*
