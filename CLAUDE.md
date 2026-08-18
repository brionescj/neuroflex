# Instrucciones para agentes de código en NeuroFlex

Lee `ARCHITECTURE.md` antes de escribir código. Es la fuente de verdad.

## Antes de proponer cambios

- Ejecuta `npm run build` y `npx oxlint`. Ambos deben pasar en verde antes y después.
- Si un archivo que vas a crear ya existe con otro nombre o en otra carpeta, dilo
  en vez de duplicarlo. Este proyecto ya tuvo dos dominios paralelos conviviendo.
- Antes de crear un tipo, revisa `src/types/`. Antes de crear una utilidad de RUT,
  revisa `src/utils/rut.ts`.

## Reglas duras

1. Login **solo por RUT**. Nunca por email. No agregues un campo `email` a ninguna entidad.
2. Un solo modelo de usuario: `AuthUser` + ficha (`Student`/`Teacher`/`Admin`),
   unidos por `rut`. No crees un `User` genérico.
3. Flujo obligatorio: `Página → Action → Service → Repository → DataSource`.
   Nunca saltes una capa. Un componente jamás importa un repositorio ni un datasource.
4. `src/services/session.service.ts` es el único archivo que puede tocar `localStorage`.
5. Nunca guardes `password` en el navegador ni en `SessionUser`.
6. No hashees contraseñas en el frontend. Es del backend.
7. No borres usuarios. Marca `enabled: false`.
8. No desactives `strict` ni ninguna opción de `tsconfig.app.json` para hacer pasar el build.
9. `import type` para todos los tipos (`verbatimModuleSyntax` está activo).
10. Imports internos siempre con alias `@/`.
11. Rutas siempre desde `ROUTES` / `DASHBOARD_BY_ROLE` en `src/config/routes.ts`.
    Nunca strings literales como `"/admin"`.
12. Servicios devuelven `ApiResponse<T>` construido con `ok()` / `fail()`.
13. Los mensajes de error de login son genéricos ("RUT o contrasena incorrectos").
    No reveles si el RUT existe.
14. El registro es **solo para estudiantes**. Docentes y administradores reciben su
    cuenta de la universidad. No agregues rutas ni formularios de autorregistro para ellos.
15. **No crees convenciones de carpetas paralelas.** Las rutas viven en
    `src/config/routes.ts` (no en `src/router/`), las páginas en `features/<x>/pages/`
    (no en `src/pages/`), los estilos en `src/index.css` (no en `src/styles/`),
    el acceso a datos en `src/repositories/` (no en `features/<x>/api/`).
    Si una carpeta te parece necesaria y no está en ARCHITECTURE.md, propónla antes de crearla.

## Estado de los datos

Los datasources de `src/data/` son **arrays mutables en memoria**.
`authRepository.create()` hace `push` sobre `authUsers` y
`studentRepository.markAsRegistered()` muta el objeto `Student`.
El estado persiste entre llamadas y se reinicia al recargar la página.
Cualquier test debe aislar o restaurar ese estado entre casos, o los resultados
dependerán del orden de ejecución.

## Herramientas disponibles

- `npm run build` — `tsc -b` + `vite build`
- `npx oxlint` — linter
- **No hay runner de tests instalado todavía.** Vitest es la primera tarea de la Fase B.

## Higiene

- No dejes archivos vacíos ni carpetas huérfanas. Si algo queda sin usar, propón borrarlo.
- No dejes `console.log` en el código entregado.
- Un commit por unidad lógica de cambio, en español, formato `tipo: descripción`.
- Al terminar una tarea, reporta: archivos creados, modificados y eliminados, con ruta completa.
