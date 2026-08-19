# NeuroFlex — Documento de Arquitectura

> Documento vivo. Toda decisión estructural se escribe aquí ANTES de programarla.
> Si el código y este documento no coinciden, uno de los dos está mal y hay que arreglarlo el mismo día.

---

## 1. Objetivo

Plataforma web para estudiantes de Educación Diferencial. Desarrolla y mide
**funciones ejecutivas** (planificación, flexibilidad cognitiva, autocontrol,
memoria de trabajo) mediante juegos cognitivos y mini casos interactivos.

Tres roles: `student`, `teacher`, `admin`.

---

## 2. Stack

**Frontend (actual)**
React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router 7 ·
React Hook Form · Zod 4 · Sonner · Axios · oxlint

**Backend (pendiente)**
Node · MongoDB Atlas · JWT

Hoy el backend está **simulado** con datasources en memoria detrás de repositorios.

---

## 3. Reglas del dominio (no negociables)

1. El **RUT** es el identificador principal. Formato canónico en base de datos: `12345678-5`
   (sin puntos, con guion, K mayúscula). Se normaliza con `normalizeForDatabase()`.
2. **Nunca** se inicia sesión con correo electrónico.
3. **Nunca** se eliminan usuarios. Solo se marca `enabled: false`.
4. Solo pueden registrarse estudiantes **previamente cargados** por la universidad.
   Docentes y administradores **no se autorregistran**: sus cuentas las crea la
   universidad directamente en `authUsers`. Por eso `registerService` consulta
   únicamente `studentRepository`.
5. No se guarda el nombre completo en un solo campo:
   `firstName` + `paternalLastName` + `maternalLastName`.
6. No se guardan cohortes como entidad; se derivan de `entryYear` + `entrySemester`.
7. Ningún componente accede directamente a un datasource. Siempre vía repositorio.

---

## 4. Arquitectura por responsabilidades

Flujo obligatorio, en un solo sentido:

    Página / Componente
        ↓
    Action        ← punto de entrada de la feature
        ↓
    Service       ← reglas de negocio
        ↓
    Repository    ← única puerta a los datos
        ↓
    DataSource    ← hoy array en memoria, mañana MongoDB

Un componente **nunca** llama a un repositorio ni a un datasource.
Un servicio **nunca** importa React.

### Carpetas

    src/
      components/        UI reutilizable sin lógica de negocio
        ui/              Button, Input, Field, InputGroup, Label, Separator, Textarea
        forms/           RutInput
        auth/            ProtectedRoute, PublicOnlyRoute
      config/            routes.ts, env.ts
      context/           auth.context.ts, AuthProvider.tsx, useAuth.ts
      data/              datasources (mock del backend)
      features/          auth, student, teacher, admin
        <feature>/
          actions/       entrada desde la UI
          components/    UI propia de la feature
          pages/
          schemas/       Zod
          services/      reglas de negocio
      layouts/           AuthLayout y (futuro) layouts privados
      lib/               axios, cn
      repositories/      auth, student, teacher, admin  (compartidos entre features)
      services/          session.service, profile.service  (transversales)
      types/             dominio compartido
      utils/             rut.ts

**Los datasources son arrays mutables en memoria.** `authRepository.create()` hace
`push` sobre `authUsers`, y `studentRepository.markAsRegistered()` muta el objeto
`Student`. El estado **persiste entre llamadas** dentro de una misma sesión del
navegador y se reinicia al recargar. Cualquier test debe aislar o restaurar ese estado.

**Por qué `repositories/` es raíz y no vive dentro de `features/auth/`:**
el registro necesita `AuthRepository` y `StudentRepository` a la vez, y el dashboard
del estudiante necesitará el segundo. Dentro de una feature obligaría a
importaciones cruzadas entre features.

---

## 5. Convenciones

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `LoginPage.tsx` |
| Servicios / repos / schemas | `nombre.tipo.ts` | `login.service.ts` |
| Tipos y hooks | camelCase / kebab-case | `auth-user.ts`, `useAuth.ts` |
| Repositorios | clase + instancia exportada en minúscula | `export const authRepository` |
| Servicios transversales | objeto literal | `export const sessionService` |
| Imports internos | siempre alias `@/` | `import { ok } from "@/types"` |
| Tipos en imports | `import type` obligatorio | `verbatimModuleSyntax` está activo |

`tsconfig.app.json` corre con `strict: true`, `noUncheckedIndexedAccess`,
`noUnusedLocals`, `erasableSyntaxOnly`. **No se desactivan.**

---

## 6. Entidades

    AuthUser   id, rut, password, role, enabled          → puede iniciar sesión
    Student    rut, firstName, paternalLastName, maternalLastName, birthDate,
               entryYear, entrySemester, studyShift, works, enabled, registered,
               email, avatarId
    Teacher    rut, firstName, paternalLastName, maternalLastName, enabled,
               email, avatarId, title
    Admin      rut, firstName, paternalLastName, maternalLastName, enabled,
               email, avatarId
    SessionUser  id, rut, role, displayName, avatarId   → lo único que va al navegador

`AuthUser` y la ficha (`Student`/`Teacher`/`Admin`) se unen por **`rut`**.
Un estudiante existe en la nómina desde que la universidad lo carga,
pero solo aparece en `authUsers` **después de registrarse**.

`email` es dato de contacto de la ficha, nunca credencial: `AuthUser` no lo
tiene y el login sigue siendo solo por RUT. `avatarId` referencia el mapa de
iconos+color en `src/config/avatars.ts` (`AVATARS`); todavía no hay carga de
imágenes propias. `title` es el título profesional del docente. El nombre de
la carrera (`"Educación Diferencial"`) vive como constante suelta en
`src/config/career.ts` (`CAREER_NAME`) — no es campo de ninguna entidad.

### Respuestas de servicio

    ApiResponse<T> = ApiSuccess<T> | ApiFailure

Unión discriminada por `success`. Se construyen con los helpers `ok()` y `fail()`.

---

## 7. Flujo de autenticación

**Login**

    rut + password
      → normalizeForDatabase(rut)
      → authRepository.findByRut
      → si no existe O password no coincide: mensaje GENÉRICO
        (distinguir ambos casos permite enumerar usuarios; los RUT son predecibles)
      → verificar account.enabled
      → profileService.findProfile(rut, role)  → displayName
      → SessionUser → sessionService.save → AuthContext
      → redirección por DASHBOARD_BY_ROLE

**Registro**

    ¿RUT en la nómina de estudiantes?  → no: rechazar
    ¿student.enabled?                  → no: rechazar
    ¿student.registered o ya hay cuenta? → sí: rechazar
    → authRepository.create({ rut, password, role: "student" })
    → studentRepository.markAsRegistered(rut)

**Sesión**

`src/services/session.service.ts` es el **único** archivo del proyecto que toca
`localStorage`. Guarda un `SessionUser` — nunca la contraseña.
Cuando exista JWT, el token se guarda aquí y el resto de la app no se entera.

`AuthProvider` expone `isLoading` durante la rehidratación para que
`ProtectedRoute` no redirija al login antes de saber si hay sesión.

---

## 8. Decisiones tomadas

✅ RUT como identificador · sesión mínima en el navegador · repositorios raíz ·
`strict` activado · mensaje de login genérico · `DASHBOARD_BY_ROLE` tipado con
`Record<UserRole, string>` para que agregar un rol sea un error de compilación.

❌ **NO** hashear contraseñas en el frontend. El cliente controla el código: el hash
   se convierte en la contraseña efectiva. Es responsabilidad exclusiva del backend.
❌ NO login por email · NO borrar usuarios · NO `User` genérico ·
   NO acceso directo al datasource · NO nombre completo en un campo · NO cohortes como entidad.

⚠️ **Pendientes de decidir antes del backend:**

1. **Dónde vive el JWT.** `localStorage` es simple pero vulnerable a XSS; cookie
   `httpOnly` es más segura pero condiciona dominio, CORS y despliegue.
2. **Unicidad de RUT entre nóminas.** Hoy nada impide que un mismo RUT esté en
   `students` y en `teachers` o `admins` a la vez; `registerService` solo consulta
   `students` y crearía una cuenta de estudiante para alguien que ya es docente.
   Se ataja con una restricción de unicidad en la base de datos, no en el servicio.
   Riesgo real cuando el administrador cargue nóminas por Excel (Fase D).

---

## 9. Hoja de ruta

**Fase A — Autenticación** ✅ completa y validada manualmente
tipos, datasources tipados, 4 repositorios, session.service, profile.service,
AuthContext con rehidratación, login, registro, logout, rutas por rol, AuthLayout.
Probados los 10 casos: los 3 logins por rol, registro exitoso, RUT fuera de nómina,
matrícula inactiva, DV inválido, persistencia tras recarga, redirección con sesión
abierta y rebote de rol incorrecto.

**Fase B — Base**
1. Vitest + tests de `utils/rut.ts` y de `registerService` (4 ramas de negocio)
2. Layouts privados: Sidebar, Navbar, Breadcrumb, Avatar
3. Dashboards reales por rol

**Fase C — Corazón del producto**
4. Juego 1: seriación de colores (autocontrol + memoria de trabajo)
5. Juego 2: conexión de nodos sin cruce (planificación + flexibilidad cognitiva)
6. Mini casos: 5 fases (lectura 10s → desvanecimiento → distractores →
   giro inesperado → ordenar 1-4), drag & drop
7. Métricas: tiempo, errores, intentos, nivel, desbloqueos

**Fase D — Gestión**
8. Panel docente: gráficos, filtros, comparación por cohorte
9. Panel administrador: carga masiva Excel, gestión de docentes/estudiantes/casos
10. Reportes y exportación a PDF/Excel

**Fase E — Producción**
11. Backend + MongoDB Atlas: solo cambia el cuerpo de los 4 repositorios
    y de `session.service.ts`. Ningún componente se toca.
12. Seguridad, optimización, despliegue.
