# PLAN-2026-11-24-pw-001-estructura-configuracion

- Modo: **COMPACTO** (andamiaje sin cambios de contrato, estado ni sincronización)
- Versión: 1
- TASK: [TASK-pw-001-estructura-configuracion](../tasks/TASK-pw-001-estructura-configuracion.md)
- Decisiones aplicables: [ADR arquitectura](../adr/ADR-pw-000-definicion-mvp-arquitectura.md) (D1), [ADR contrato](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md) (límites, seguridad básica)

## Objetivo

Dejar frontend y backend ejecutables en local, con una conexión WebSocket
establecible y cerrable desde la página, configuración por entorno, lint y README.

## Alcance

Servidor Socket.IO mínimo sin lógica de dominio; cliente React + Vite con página
técnica de conexión; scripts raíz; ESLint; `.env.example`; README. Sin estado de sala,
eventos de dominio, Canvas ni reconexión.

## Pasos

| # | Paso | Archivos |
|---|---|---|
| 1 | Dependencias aprobadas, scripts raíz (`dev`, `build`, `lint`, `test`, `typecheck`), `engines.node >=22.9`, excepción `!.env.example` en `.gitignore` | `package.json`, `.gitignore`, `*/package.json` |
| 2 | ESLint *flat config* y script `lint` | `eslint.config.js`, `*/package.json` |
| 3 | Servidor: `config.ts` (PORT, ALLOWED_ORIGINS), `app.ts` (`createAppServer`, `/health`, Socket.IO, `allowRequest`, `maxHttpBufferSize`), `index.ts`, `tsconfig.json`, `.env.example` | `server/src/*`, `server/tsconfig.json`, `server/.env.example` |
| 4 | Pruebas de servidor: config, arranque, conexión, `Origin`, mensaje grande | `server/test/*` |
| 5 | Cliente: `tsconfig`, Vite, `index.html`, `config.ts`, `connection.ts`, `App.tsx`, `main.tsx`, `.env.example` | `client/*` |
| 6 | Pruebas de cliente (config y controlador con socket falso, entorno `node`) | `client/test/*` |
| 7 | README (requisitos, instalación, ejecución, variables, scripts, puertos) y actualización de `CLAUDE.md` (comandos y deuda de lint) | `README.md`, `CLAUDE.md` |
| 8 | Verificación completa y comprobación manual de `npm run dev` y de la página en navegador | — |

Dependencias entre pasos: 2 tras 1; 4 tras 3; 6 tras 5; 8 al final. Los pasos 3–4 y 5–6
son independientes entre sí.

## Verificación por criterio

| Criterio | Verificación |
|---|---|
| AC-1 | `server/test/server.test.ts`; `npm run build`; arranque manual de `npm run dev` |
| AC-2 | `server/test/connection.test.ts`; `client/test/connection.test.ts`; comprobación manual en navegador (Conectar/Desconectar) |
| AC-3 | `server/test/config.test.ts`; `client/test/config.test.ts` |
| AC-4 | `server/test/connection.test.ts` (Origin permitido, no listado, ausente) |
| AC-5 | `server/test/connection.test.ts` (opción y cierre con 16 385 bytes) |
| AC-6 | `npm run lint && npm run typecheck && npm test && npm run build` |
| AC-7 | Revisión del README y `git ls-files` |

Playwright no corresponde (ver TASK).

## Notas

- Si `--env-file-if-exists` o ESLint 10 con TypeScript 7 dieran incompatibilidades, se
  registra como desviación en `delivery-build` (versiones fijadas por el lockfile).
- Nada de esto cambia el contrato; si durante la implementación hiciera falta un evento
  nuevo o distinto de `connect`/`disconnect`, vuelve a `delivery-start`.
