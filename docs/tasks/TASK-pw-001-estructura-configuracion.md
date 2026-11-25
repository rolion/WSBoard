# TASK-pw-001-estructura-configuracion — Estructura del proyecto y configuración

- Trello: [PW-001](https://trello.com/c/jFaDZadn/2-pw-001-estructura-del-proyecto-y-configuraci%C3%B3n) (lista "En desarrollo")
- Rama: `task/TASK-pw-001-estructura-configuracion`
- PR: [rolion/WSBoard#2](https://github.com/rolion/WSBoard/pull/2)
- Etapa actual: `PUBLISH`
- Clasificación: `NEEDS_PLAN`
- Diseño requerido: No
- Plan: [PLAN-2026-11-24-pw-001-estructura-configuracion](../plans/PLAN-2026-11-24-pw-001-estructura-configuracion.md) (COMPACTO)
- Specification readiness: `READY`

## Investigación

**Requisitos de la tarjeta** (sin checklists ni comentarios): crear frontend,
backend y scripts de desarrollo local; configurar lint, TypeScript, variables de
entorno, conexión WebSocket y README. Aceptación: (1) frontend y backend inician
localmente; (2) la página puede establecer y cerrar una conexión WebSocket;
(3) instrucciones de instalación y ejecución documentadas. Dependencia: PW-000
(mergeada, `7c59dd8`).

**Estado del repositorio** (`main` = `7c59dd8`):

- Workspaces `shared`, `server`, `client` en `package.json:6`. Scripts raíz solo
  `test` y `typecheck` (`package.json:8-9`); no hay `dev`, `build` ni `lint`.
- `client/package.json` y `server/package.json` son esqueletos sin scripts ni
  dependencias ni `tsconfig` (descripción "Esqueleto", líneas 6).
- `shared/` está completo: `PROTOCOL_VERSION`, `ROOM_ID`, `MAX_MESSAGE_BYTES` y
  demás límites en `shared/src/limits.ts:2-28`; `shared/package.json:6-7` expone
  `src/index.ts` como `main`/`types` (sin paso de build).
- `tsconfig.base.json` ya define `strict`, `Bundler` y `lib` con `DOM`;
  `shared/tsconfig.json` extiende la base.
- `.gitignore:4-5` ignora `.env` y `.env.*`: **también ignoraría `.env.example`**
  (hay que añadir la excepción).
- `README.md` contiene solo `# WSBoard` y está codificado en UTF-16 (se
  reescribe en UTF-8).
- Node local 22.12 / npm 10.9. `package.json:12` declara `node >=20`.
- No existen aún: código de cliente, servidor, Canvas, pruebas de integración,
  Playwright ni `lint` (deuda registrada en PW-000, `CLAUDE.md`).

**Contratos y ADR aplicables** (no cambian en este TASK):

- ADR arquitectura D1: Socket.IO 4 solo `websocket`, React 18 + Vite, Vitest
  con cliente `socket.io-client` para integración.
- ADR contrato: `MAX_MESSAGE_BYTES` = `maxHttpBufferSize`; un mensaje mayor
  cierra la conexión; `ALLOWED_ORIGINS` configurable para validar `Origin`
  (sección "Seguridad básica"); cualquier evento distinto de
  `session:join`/`session:resume` antes de unirse recibe `NOT_JOINED` (esa
  lógica llega con la tarea del servidor, no aquí).
- Verificación diferida de PW-000 (A3, cierre por mensaje grande) pasa a ser
  verificable aquí porque habrá servidor.

**Veredicto**

- `NEEDS_PLAN`: andamiaje con varios archivos y dependencias nuevas, pero no
  cambia eventos, `seq`, sincronización ni autoridad del estado. No requiere ADR.
- Diseño: **no requerido**. La página es una pantalla técnica provisional
  (estado de conexión y botones Conectar/Desconectar); las pantallas finales
  ya están definidas en el
  [DDR de PW-000](../design/DDR-pw-000-definicion-mvp-experiencia.md) y llegan
  en tareas posteriores.

**Decisiones del usuario (2026-11-24)**

- Lint: instalar ESLint + typescript-eslint (cierra la deuda de PW-000).
- Dependencias nuevas aprobadas: server `socket.io`, `tsx` (dev), `socket.io-client`
  (dev, para pruebas de integración); client `react@18`, `react-dom@18`, `vite`,
  `@vitejs/plugin-react`, `socket.io-client`, `@types/react`, `@types/react-dom`;
  raíz `concurrently`, `eslint`, `@eslint/js`, `typescript-eslint`,
  `eslint-plugin-react-hooks`. Variables de entorno con `node --env-file`, sin `dotenv`.

**Supuestos** (derivados de lo anterior; no cambian la Specification de PW-000)

| ID | Supuesto |
|---|---|
| A-1 | Puertos por defecto: servidor 3001, Vite 5173. |
| A-2 | `ALLOWED_ORIGINS` por defecto `http://localhost:5173`; una petición **sin** cabecera `Origin` (clientes no navegador, pruebas) se acepta; con `Origin` no listado se rechaza en el handshake. |
| A-3 | El cliente de esta tarea no se reconecta solo (`reconnection: false`); reconexión y `session:resume` pertenecen a tareas posteriores. |
| A-4 | `engines.node` sube a `>=22.9` por `--env-file-if-exists` (Node local 22.12). |
| A-5 | Playwright no corresponde (ver Test Specification); se verifica con integración y comprobación manual en navegador. |

## Specification

**Alcance:** monorepo ejecutable en local: servidor Node + Socket.IO mínimo (acepta
y cierra conexiones; sin eventos de dominio ni estado), cliente React + Vite con
página técnica de conexión, configuración por variables de entorno, `lint`,
`typecheck`, `test`, `build` y `dev` desde la raíz, y README.

**Fuera de alcance:** `session:join`/`resume`, estado de sala, snapshot, chat,
presencia, Canvas, reconexión, E2E Playwright, despliegue, CI.

**Criterios de aceptación**

- **AC-1** `npm run dev` en la raíz arranca servidor y cliente; el servidor escucha
  en `PORT` y el cliente sirve la página en el puerto de Vite.
- **AC-2** La página establece una conexión WebSocket al servidor (transporte
  `websocket`, sin *long-polling*) con "Conectar" y la cierra con "Desconectar";
  el estado visible refleja desconectado, conectando, conectado y error.
- **AC-3** El servidor lee `PORT` y `ALLOWED_ORIGINS`, y el cliente
  `VITE_SERVER_URL`, desde variables de entorno con valores por defecto; un
  valor inválido hace fallar el arranque con un mensaje claro.
- **AC-4** El handshake con `Origin` no incluido en `ALLOWED_ORIGINS` se rechaza.
- **AC-5** `maxHttpBufferSize` del servidor es `MAX_MESSAGE_BYTES` de `shared/`
  (única fuente) y un mensaje mayor cierra la conexión.
- **AC-6** Existen y pasan `npm run lint`, `typecheck`, `test` y `build` en todos
  los workspaces aplicables.
- **AC-7** El README documenta requisitos, instalación, ejecución, variables
  (con `.env.example` versionados, sin secretos) y scripts.

**Casos límite:** puerto ocupado (error claro y salida con código 1); servidor
apagado al pulsar Conectar (estado de error, sin excepción no controlada);
Desconectar mientras conecta; conectar dos veces seguidas (una sola conexión);
`ALLOWED_ORIGINS` con espacios, vacíos o duplicados; `PORT` no numérico o fuera de
rango; conexión sin unirse no crea participante ni estado.

## Test Specification

| Criterio | Verificación | Tipo |
|---|---|---|
| AC-1 | `server/test/server.test.ts`: `startServer` escucha (puerto 0) y responde `GET /health`; error claro con puerto ocupado. `npm run build -w @pw/client`. Comprobación manual de `npm run dev` registrada en Testing | Integración + manual |
| AC-2 | `server/test/connection.test.ts` (cliente `socket.io-client`: conecta, `io.engine.transport.name === "websocket"`, desconecta, el servidor ve la desconexión). `client/test/connection.test.ts`: controlador con socket falso (transiciones, doble conexión, desconectar mientras conecta, error). Comprobación manual en navegador | Unitaria + integración + manual |
| AC-3 | `server/test/config.test.ts` y `client/test/config.test.ts`: defaults, parseo de `ALLOWED_ORIGINS`, `PORT` inválido | Unitaria |
| AC-4 | `server/test/connection.test.ts`: `Origin` permitido conecta, no listado rechazado, sin `Origin` conecta | Integración |
| AC-5 | `server/test/connection.test.ts`: opción igual a `MAX_MESSAGE_BYTES` y mensaje de 16 385 bytes cierra el socket | Integración |
| AC-6 | `npm run lint && npm run typecheck && npm test && npm run build` | Comandos |
| AC-7 | Revisión documental del README y de `git ls-files` (`.env.example` presentes, `.env` ausente) | Revisión |

**Playwright: no corresponde.** No hay flujo de colaboración, entrada tardía ni
reconexión que dependan de dos contextos, y la dependencia no está aprobada. Será
obligatorio en las tareas de colaboración (dos contextos independientes).

## Implementation Plan

Ver [PLAN-2026-11-24-pw-001-estructura-configuracion](../plans/PLAN-2026-11-24-pw-001-estructura-configuracion.md) (COMPACTO, v1).

## Decisiones

No hay ADR ni DDR: el cambio no toca el contrato, la autoridad del estado ni la
sincronización. Decisiones técnicas rutinarias:

- Servidor: `createAppServer(config)` / `startServer` separados de `index.ts` para
  probarlos con puerto 0. Socket.IO con `transports: ["websocket"]`,
  `maxHttpBufferSize: MAX_MESSAGE_BYTES` y validación de `Origin` en `allowRequest`.
- `GET /health` responde `{ "status": "ok" }` (sin datos de sala).
- Cliente: `src/connection.ts` aislado de React (controlador con socket inyectable)
  y `App.tsx` solo presenta estado; `VITE_SERVER_URL` por defecto `http://localhost:3001`.
- ESLint con *flat config* única en la raíz; `lint` por workspace con `eslint .`.
- `shared/` sigue sin paso de build (se consume como TypeScript); Vite y `tsx`
  lo resuelven por el workspace.

## Implementación

**Cambios**

- Raíz: scripts `dev` (concurrently), `build`, `lint`; `engines.node >=22.9`;
  `eslint.config.js` (flat config, `typescript-eslint`, `react-hooks` en `client/`);
  `.gitignore` con `!.env.example`.
- `server/`: `src/config.ts` (`loadConfig`), `src/app.ts` (`createAppServer`: `/health`,
  Socket.IO solo `websocket`, `maxHttpBufferSize = MAX_MESSAGE_BYTES`, `allowRequest`
  por `Origin`), `src/index.ts`, `tsconfig.json`, `.env.example`.
- `client/`: Vite + React 18; `src/config.ts` (`getServerUrl`), `src/connection.ts`
  (controlador con `attach`/`detach`, socket inyectable), `src/App.tsx` (página técnica con
  `role="status"`), `index.html`, `vite.config.ts` (puerto 5173), `tsconfig.json`, `.env.example`.
- `shared/src/schemas.ts`: `eslint-disable no-control-regex` con motivo (la regex de
  caracteres de control es intencional); sin cambio de comportamiento.
- `README.md` (UTF-8, antes UTF-16) y `CLAUDE.md` (comandos; se elimina la deuda de lint).
- Dependencias (aprobadas): `socket.io`, `tsx`, `socket.io-client`, `react@18`,
  `react-dom@18`, `vite`, `@vitejs/plugin-react`, `@types/react@18`, `@types/react-dom@18`,
  `concurrently`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`.
  `typescript`, `vitest` y `@types/node` ya aprobadas en PW-000; se declaran también en
  `server/` y `client/`. `@pw/shared` se declara como dependencia de ambos.

**Criterios cubiertos**

| Criterio | Verificación |
|---|---|
| AC-1 | `server/test/server.test.ts`; `npm run build`; `npm run dev` ejecutado a mano (servidor en 3001, Vite en 5173, `/health` 200) |
| AC-2 | `server/test/connection.test.ts`; `client/test/connection.test.ts`; página probada en el navegador integrado: Conectar → "Conectado", Desconectar → "Desconectado"; con el servidor apagado → "No se pudo conectar al servidor" |
| AC-3 | `server/test/config.test.ts`; `client/test/config.test.ts` |
| AC-4 | `server/test/connection.test.ts` (permitido, no listado, ausente) |
| AC-5 | `server/test/connection.test.ts` (opción y cierre con `MAX_MESSAGE_BYTES + 1`; cubre la verificación diferida A3 de PW-000) |
| AC-6 | `npm run lint`, `typecheck`, `test`, `build` en PASS |
| AC-7 | `README.md`, `server/.env.example`, `client/.env.example` |

**Pruebas ejecutadas:** `npm test` → shared 75, server 16, client 10, PASS;
`npm run typecheck` PASS; `npm run lint` PASS; `npm run build` PASS; `npm audit` 0
vulnerabilidades.

**Desviaciones**

- Hallazgo propio durante la comprobación manual: con `StrictMode`, un `dispose()` final
  dejaba el controlador sin listeners y la página quedaba en "Conectando…". Se sustituyó por
  `attach()`/`detach()` reiniciables, con prueba del ciclo attach/detach/attach. Sin cambio
  de Specification ni de plan.
- `eslint` quedó en 9.39.5 (la resolvió npm; ESLint 10 no se probó y los pares de
  `typescript-eslint` y `react-hooks` lo admiten). Funciona con TypeScript 7.0.2. Aviso
  `EBADENGINE` de `eslint-visitor-keys` en Node 22.12 (pide ≥22.13); no bloquea.
- El cliente usa `reconnection: false` (supuesto A-3).

**Deuda técnica**

- Sin componente de prueba de la página (sin jsdom/Testing Library ni Playwright): la
  lógica está en `connection.ts` y el render se comprobó a mano.
- La prueba "mensaje dentro del límite no cierra" usa una espera de 100 ms; es una
  aserción negativa sin evento observable.
- Solo se compila el cliente en `build`; el servidor se ejecuta con `tsx`.

## Testing

Commit revisado: `2060f0b` (revisor independiente, subagente de contexto limpio sin edición).

| Verificación | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | PASS |
| Tipos | `npm run typecheck` | PASS |
| Unitarias e integración | `npm test` | PASS: shared 75, server 16, client 10 |
| Build | `npm run build` | PASS (cliente 183 kB) |
| Seguridad de dependencias | `npm audit` | PASS: 0 vulnerabilidades |
| Config inválida | `PORT=abc`, `ALLOWED_ORIGINS=" "`, puerto ocupado | PASS: mensaje claro y exit 1 |
| Servidor | `GET /health`; `/socket.io/?transport=polling` | PASS: 200; 400 (sin polling) |
| Higiene del diff | `git ls-files` | PASS: `.env.example` presentes; sin `.env`, `dist`, logs ni `node_modules` |
| `npm run dev` y página en navegador | manual (autor) | PASS: Conectar → Conectado, Desconectar → Desconectado, servidor apagado → error. El revisor no lo repitió |
| Playwright | — | NO APLICA (ver Test Specification) |
| Revisión visual | — | NO APLICA: pantalla técnica provisional sin DDR |

## Review

**Veredicto: PASS** (2026-11-24, commit revisado `2060f0b`). Revisión independiente con
subagente de contexto limpio y sin permisos de edición. AC-1 a AC-7 y los casos límite
cumplidos. Sin hallazgos Critical, High ni Medium.

| REV | Severidad | Categoría | Criterio | Estado |
|---|---|---|---|---|
| [01](../reviews/REV-2026-11-24-pw-001-estructura-configuracion-01.md) | Low | IMPLEMENTATION | AC-3 | Abierto (permitido) |
| [02](../reviews/REV-2026-11-24-pw-001-estructura-configuracion-02.md) | Low | IMPLEMENTATION | AC-5 | Abierto (permitido) |
| [03](../reviews/REV-2026-11-24-pw-001-estructura-configuracion-03.md) | Low | IMPLEMENTATION | AC-2 | Abierto (permitido) |

El revisor señaló además que `Testing`, `Review` y `Publicación` estaban vacías; se
completan aquí.

## Publicación

PR [rolion/WSBoard#2](https://github.com/rolion/WSBoard/pull/2) listo para revisión humana. El merge es manual.

- Plan: [PLAN-2026-11-24-pw-001-estructura-configuracion](../plans/PLAN-2026-11-24-pw-001-estructura-configuracion.md) (COMPACTO, v1). Sin ADR ni DDR nuevos.
- Limitaciones: sin prueba automatizada del render de la página ni Playwright; el error de `VITE_SERVER_URL` inválida solo aparece en la consola (REV-01 a 03, Low).
- A revisar por quien apruebe: dependencias nuevas (ver `## Implementación`), `engines.node >=22.9`, política de `Origin` (se acepta la ausencia de cabecera) y el `eslint-disable` en `shared/src/schemas.ts:65`.

## Historial

| Fecha | Transición | Nota |
|---|---|---|
| 2026-11-24 | INVESTIGATION → PLANNING | Tarjeta leída; usuario aprueba ESLint y dependencias; Specification `READY` |
| 2026-11-24 | PLANNING → ENGINEERING | PR abierto; se invoca `delivery-build` |
| 2026-11-24 | ENGINEERING → REVIEW | Implementado; lint, typecheck, build y 101 pruebas en PASS; comprobación manual en navegador |
| 2026-11-24 | REVIEW → PUBLISH | Veredicto PASS en `2060f0b`; REV-01 a 03 (Low) abiertos y permitidos |
