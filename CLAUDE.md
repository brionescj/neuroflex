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

## Higiene

- No dejes archivos vacíos ni carpetas huérfanas. Si algo queda sin usar, propón borrarlo.
- No dejes `console.log` en el código entregado.
- Un commit por unidad lógica de cambio, en español, formato `tipo: descripción`.
- Al terminar una tarea, reporta: archivos creados, modificados y eliminados, con ruta completa.
