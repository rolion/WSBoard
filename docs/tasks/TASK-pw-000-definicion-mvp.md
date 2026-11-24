# TASK-pw-000-definicion-mvp — Definición del MVP y decisiones técnicas

- Trello: [PW-000](https://trello.com/c/TBxriweK/1-pw-000-definici%C3%B3n-del-mvp-y-decisiones-t%C3%A9cnicas) (lista "Alcance y arquitectura")
- Rama: `task/TASK-pw-000-definicion-mvp`
- PR: [rolion/WSBoard#1](https://github.com/rolion/WSBoard/pull/1)
- Etapa actual: `REVIEW` (supuestos S1–S6 aprobados por el usuario el 2026-11-24)
- Clasificación: `NEEDS_ARCHITECTURE`
- Diseño requerido: Sí (DDR de pantallas y estados)
- Plan: [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md) (COMPLETO)
- Specification readiness: `READY` (con supuestos S1–S6 sujetos a aprobación explícita)

## Investigación

**Estado del repositorio** (rama `task/TASK-pw-000-definicion-mvp`, commits
`27dd363`, `bb55d3d`):

- Existe solo `README.md:1` (`# WSBoard`) y las tres skills en
  `.claude/skills/delivery-{start,build,publish}/SKILL.md`.
- **No existen**: código (React, Canvas, WebSocket), pruebas, contratos,
  `CLAUDE.md`, `docs/`, ni
  `.claude/skills/delivery-start/references/plantillas.md`, aunque las tres
  skills lo referencian (`delivery-start/SKILL.md:7`,
  `delivery-build/SKILL.md:18-19`, `delivery-publish/SKILL.md:19-20`).
  Se usó la estructura implícita de las skills (`## Investigación`,
  `## Implementación`, `## Review`, `## Publicación`, `## Testing`,
  `## Changes`) y se crea la plantilla en el plan.
- No hay ADR ni DDR previos que respetar.

**Requisitos de la tarjeta** (fuente de requisitos): pizarra compartida en
tiempo real, usuarios por alias, chat y presencia; sala pública única; sin
cuentas ni persistencia; sesiones en memoria; stack propuesto React + TS +
Canvas 2D + Node.js con Socket.IO/WebSocket; servidor autoritativo de aliases
y estado; sin imágenes completas por movimiento; eventos estructurados de
trazos; snapshot al entrar; límites de eventos y payloads. Criterio de salida:
arquitectura, contrato de eventos, definición de sala y política de reinicio
acordadas. La tarjeta no tiene checklists ni comentarios.

**Veredicto**

- `NEEDS_ARCHITECTURE`: fija quién controla el estado compartido, su
  (no) persistencia y la estrategia de sincronización.
- Diseño: requerido, porque define las pantallas y estados visibles.

**Supuestos (a confirmar al aprobar la Specification)**

| ID | Supuesto | Dónde |
|---|---|---|
| S1 | Socket.IO (solo `websocket`) en lugar de `ws` | ADR arquitectura D1 |
| S2 | Reglas de alias: 2–20 caracteres, letras/dígitos/espacio/`_-.`, único sin distinguir mayúsculas | ADR contrato |
| S3 | La sala vacía conserva su estado hasta reiniciar el proceso | ADR arquitectura D4 |
| S4 | Sin "limpiar pizarra", deshacer, formas, texto ni exportar en el MVP | Specification |
| S5 | Gracia de reconexión de 30 s; tope de 5 000 trazos y 30 participantes | ADR arquitectura |
| S6 | Una pestaña = un participante (token en `sessionStorage`) | ADR arquitectura D5 |

## Specification

**Alcance (MVP):** una sala pública `main`, participantes por alias, pizarra
con lápiz y borrador, chat de texto, lista de presencia, servidor autoritativo,
estado en memoria.

**Fuera de alcance:** cuentas, múltiples salas, persistencia (dibujos, chat,
sesiones), limpiar o deshacer, formas, texto en la pizarra, imágenes, exportar,
moderación, escalado horizontal, cifrado de aplicación.

**Criterios de aceptación de este TASK** (el contrato es el entregable):

- **AC-1** Los límites de la tabla del ADR de contrato existen como constantes
  únicas compartidas por cliente y servidor.
- **AC-2** El alias se normaliza y valida con las reglas de S2, y existe una
  clave de comparación insensible a mayúsculas.
- **AC-3** Cada evento C→S tiene un esquema de validación que rechaza payloads
  fuera de límites y descarta campos desconocidos.
- **AC-4** Las coordenadas se expresan en `[0,1]` sobre un lienzo 16:9 y hay
  conversión a píxeles con letterbox y `devicePixelRatio`.
- **AC-5** Todos los eventos y códigos de error del ADR de contrato están
  declarados en `shared/` y coinciden con el documento.
- **AC-6** ADR, DDR, TASK y `shared/` son coherentes entre sí.
- **AC-7** La política de reinicio (D4) está documentada y reflejada en el
  contrato (`SESSION_EXPIRED`) y en `CLAUDE.md`.

**Comportamiento del producto que el contrato debe permitir** (para tareas
futuras): alias único entre participantes activos; snapshot al entrar (con
trazos abiertos); trazos en tiempo real entre dos navegadores; chat difundido
a todos en el mismo orden; reconexión < 30 s conserva alias; > 30 s o reinicio
libera el alias y vuelve a la entrada.

**Casos límite:** alias duplicado concurrente (gana el primero en llegar al
servidor); entrada mientras alguien dibuja; autor que se desconecta con un
trazo abierto; trazo enorme; sala llena; payload malformado o > 16 KiB; reinicio
con clientes conectados; pestaña duplicada con el mismo token; reintento de
chat tras perder el ack.

## Test Specification

Ver la estrategia del [plan](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md#estrategia-de-verificación).
Playwright **no corresponde** en este TASK; es obligatorio (dos contextos
independientes, entrada tardía y reconexión) en las tareas de colaboración.

## Implementation Plan

Ver [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md) (COMPLETO, v1).

## Decisiones

- [ADR arquitectura](../adr/ADR-pw-000-definicion-mvp-arquitectura.md)
- [ADR contrato de eventos](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md)
- [DDR experiencia](../design/DDR-pw-000-definicion-mvp-experiencia.md)

## Implementación

**Cambios**

- Plantillas y reglas: `CLAUDE.md`, `.claude/skills/delivery-start/references/plantillas.md`.
- Monorepo npm workspaces: `package.json`, `tsconfig.base.json`, `.gitignore`;
  `client/` y `server/` solo con `package.json` (esqueleto).
- `shared/src`: `limits.ts`, `errors.ts`, `types.ts`, `schemas.ts` (zod),
  `events.ts`, `coords.ts`, `index.ts`.
- `shared/test`: `limits`, `alias`, `schemas`, `coords`, `events`.
- Dependencias nuevas (confirmadas por el usuario): `typescript` 7.0.2,
  `vitest` 5.1.1, `@types/node`, `zod` 4.6.7, solo en `@pw/shared`.

**Criterios cubiertos**

| Criterio | Verificación |
|---|---|
| AC-1 | `shared/test/limits.test.ts` |
| AC-2 | `shared/test/alias.test.ts` |
| AC-3 | `shared/test/schemas.test.ts` |
| AC-4 | `shared/test/coords.test.ts` (320×180, 800×450, 1000×700, 500×900, dpr 2) |
| AC-5 | `shared/test/events.test.ts` |
| AC-6 | `shared/test/events.test.ts` compara eventos y códigos con el ADR de contrato; revisión final en `delivery-publish` |
| AC-7 | `shared/test/events.test.ts` (`SESSION_EXPIRED` y D4) + `CLAUDE.md` |

**Pruebas ejecutadas**

- `npm test` → 5 archivos, 35 pruebas, PASS.
- `npm run typecheck` → PASS.
- Integración y Playwright: no aplican (sin servidor ni UI), según el plan.

**Desviaciones**

- TypeScript 7 exige declarar `"types": ["node"]` en `shared/tsconfig.json`
  para las pruebas que leen los ADR. Sin impacto en el contrato.
- `ALIAS_PATTERN` permite `.` y `-` al inicio o fin del alias (solo se
  prohíben espacios dobles y en los extremos), conforme al ADR.

**Deuda técnica**

- No hay `lint` (ESLint no se instaló; decisión del usuario). El script
  `lint` del plan queda pendiente.
- `server/` y `client/` no tienen `tsconfig` ni scripts hasta sus tareas.
- Los límites de tasa y `MAX_MESSAGE_BYTES` son constantes: aún no hay código
  que los aplique (tareas de servidor).

## Testing

_(lo completa `delivery-publish`)_

## Review

_(lo completa `delivery-publish`)_

## Publicación

_(lo completa `delivery-publish`)_

## Historial

| Fecha | Transición | Nota |
|---|---|---|
| 2026-11-24 | INVESTIGATION → DESIGN → ARCHITECTURE → PLANNING | Documentación inicial; Specification `READY` con supuestos S1–S6 |
| 2026-11-24 | PLANNING → ENGINEERING | Usuario aprueba S1–S6 y confirma Socket.IO (S1) frente a `ws`. ADR y DDR pasan a `Aceptado` |
| 2026-11-24 | ENGINEERING → REVIEW | `shared/` implementado; 35 pruebas y typecheck en PASS |
