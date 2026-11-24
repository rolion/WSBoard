# TASK-pw-000-definicion-mvp — Definición del MVP y decisiones técnicas

- Trello: [PW-000](https://trello.com/c/TBxriweK/1-pw-000-definici%C3%B3n-del-mvp-y-decisiones-t%C3%A9cnicas) (lista "Alcance y arquitectura")
- Rama: `task/TASK-pw-000-definicion-mvp`
- PR: [rolion/WSBoard#1](https://github.com/rolion/WSBoard/pull/1)
- Etapa actual: `PUBLISH` (supuestos S1–S6 aprobados por el usuario el 2026-11-24)
- Clasificación: `NEEDS_ARCHITECTURE`
- Diseño requerido: Sí (DDR de pantallas y estados)
- Plan: [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md) (COMPLETO, v2.1)
- Specification readiness: `READY` (supuestos S1–S6 aprobados el 2026-11-24)

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

### Enmienda de Specification v2 (2026-11-24, aprobada por el usuario)

Aprobación: el usuario respondió "adelante, aplica las recomendaciones" a la
propuesta de resolver REV-01, 03, 04, 05, 06 y 07. Decisión:
[ADR de ajustes](../adr/ADR-pw-000-definicion-mvp-ajustes-revision.md) (A1–A6).
Los ADR de arquitectura y de contrato quedan enmendados y enlazados a él; su
texto original se conserva con el cambio señalado.

| Cambio de Specification | Criterio |
|---|---|
| Tope agregado `MAX_TOTAL_POINTS = 500 000` y cota de snapshot (~8 MB) | AC-1 ampliado; **AC-8** nuevo |
| Mapeo de fallos de esquema a códigos de error (`parseClientEvent`) | **AC-9** nuevo; AC-3 ampliado |
| Mensaje de tamaño excesivo cierra el socket; se elimina "3 seguidos" | AC-5 (contrato) |
| Todo cierre forzado de trazo difunde `stroke:ended` | AC-5 (contrato) |
| Se eliminan `reason: "replaced"` y `lastSeq` de `session:resume` | AC-3, AC-5 |
| `seq:advance` en la tabla S→C; `snapshot.seq` incluye `presence:joined` propio | AC-5 |

- **AC-8** El límite `MAX_TOTAL_POINTS` existe como constante compartida y el ADR
  define su efecto (`BOARD_FULL`, rechazo del lote, cierre del trazo).
- **AC-9** `parseClientEvent` valida cada evento C→S y devuelve el código de error
  definido en A2, sin que el servidor reimplemente el mapeo.

### Aclaración de Specification v2.1 (2026-11-24, aprobada por el usuario)

Aprobación: el usuario respondió "Aclarar A2" a la propuesta de resolver REV-15.
Cambio de Specification: en el [ADR de ajustes](../adr/ADR-pw-000-definicion-mvp-ajustes-revision.md)
(A2), el mapeo por evento prevalece sobre la regla de "payload que no es un objeto".
`stroke:*` y `chat:send` devuelven `STROKE_INVALID` y `CHAT_INVALID` ante cualquier
fallo; `PAYLOAD_INVALID` queda para `session:resume`, `session:join` (cuando no falla
`protocol` ni `alias`, incluido un payload que no es un objeto) y eventos desconocidos.
Criterio afectado: **AC-9**. El comportamiento del código no cambia.

## Test Specification

Ver la estrategia del [plan](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md#estrategia-de-verificación).
Playwright **no corresponde** en este TASK; es obligatorio (dos contextos
independientes, entrada tardía y reconexión) en las tareas de colaboración.

## Implementation Plan

Ver [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md) (COMPLETO, v2; la v2 añade los pasos 7 y 8 por la enmienda de Specification).

## Decisiones

- [ADR arquitectura](../adr/ADR-pw-000-definicion-mvp-arquitectura.md)
- [ADR contrato de eventos](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md)
- [ADR de ajustes tras la revisión](../adr/ADR-pw-000-definicion-mvp-ajustes-revision.md) (enmienda a los dos anteriores)
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

### Corrección de hallazgos de implementación (2026-11-24, tras REV de `94df2aa`)

| REV | Cambio | Verificación |
|---|---|---|
| 02 | Tipos de payload S→C (`ServerEventPayloads`), acks (`JoinAck`, `ResumeAck`, `ChatSendAck`, `AckError`) en `types.ts`; mapas `ClientAcks` y `ClientEventPayloads` en `events.ts` | `hardening.test.ts` (`expectTypeOf`) + typecheck |
| 08 | `strokeIdSchema = z.uuidv4()` | UUID nil y v1 rechazados |
| 09 | `chat:send` rechaza C1 (U+0080–U+009F), U+2028 y U+2029 | pruebas con `\u0085`, `\u2028`, `\u2029` y `\r`; 500 caracteres con 5 y 6 saltos |
| 10 | `toLogical` devuelve 0 si la entrada no es finita; alias acepta marcas combinantes (`\p{M}`) exigiendo al menos una letra o dígito | `NaN`/`Infinity`; hindi, tailandés; marca sola rechazada |
| 11 | `RATE_STROKE_EVENTS`, `RATE_CHAT = {messages, windowMs}` según ADR; constantes extra tabuladas en el ADR | `limits.test.ts` |

Pruebas añadidas por la revisión (`shared/test/hardening.test.ts`): ancho
inclusivo 0.001/0.05, punto de 1 y 3 elementos, campos desconocidos en todos los
eventos, `dpr` fraccionario.

**Resultado:** `npm test` → 6 archivos, 51 pruebas, PASS; `npm run typecheck` → PASS.

**Desviaciones:** ediciones al ADR de contrato solo para reflejar el código
(fila de alias con marcas combinantes, `CHAT_MAX_NEWLINES`, `LOGICAL_ASPECT`,
`COORD_DECIMALS`); no cambian el comportamiento aprobado. Hubo que sustituir
separadores U+2028/U+2029 literales por escapes en la regex de `schemas.ts`.

**Siguen abiertos** (requieren aprobación explícita, no se tocaron): REV-01, 03,
04, 05, 06 y 07 (SPECIFICATION/ARCHITECTURE).

### Aplicación de la enmienda v2 (2026-11-24)

- `shared/src/limits.ts`: `MAX_TOTAL_POINTS = 500_000`.
- `shared/src/schemas.ts`: `session:resume` sin `lastSeq`.
- `shared/src/types.ts`: `presence:left.reason` solo `"leave" | "timeout"`;
  `SeqAdvancePayload` documentado como sin `seq` propio.
- `shared/src/validation.ts` (nuevo): `parseClientEvent` con el mapeo de A2.
- Pruebas: `validation.test.ts` (AC-9, REV-06/07), ajustes en `limits.test.ts`,
  `schemas.test.ts`, `hardening.test.ts`.
- Resultado: `npm test` → 7 archivos, 61 pruebas, PASS; `npm run typecheck` → PASS.
- Verificación diferida (no aplica sin servidor): `MAX_MESSAGE_BYTES` cierra el
  socket (A3), rechazo por `MAX_TOTAL_POINTS` y difusión de `stroke:ended` en
  cierres forzados (A1, A4). Quedan como pruebas de integración de la tarea del servidor.
- Desviaciones: ninguna respecto de la enmienda. REV-12 y REV-13 (Low) siguen abiertos.
- Incidente: un script de edición del TASK mutiló el archivo en el commit `0f07df0`
  (ancla ambigua); se restauró desde `21a7bdf` conservando el historial.

### Corrección de REV-12, 13, 14 y 16 (2026-11-24, tras REV de `895ae4b`)

| REV | Cambio | Verificación |
|---|---|---|
| 14 | `parseClientEvent` usa `Object.hasOwn` y rechaza nombres de evento que no son cadena | `validation.test.ts`: `constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf`, `undefined` y `42` devuelven `PAYLOAD_INVALID` sin lanzar |
| 12 | La prueba de alias con extremos `.` y `-` usa expectativas literales | `hardening.test.ts` |
| 13 | Decisión documentada: las marcas combinantes pueden aparecer en cualquier posición de una palabra (fila de alias del ADR de contrato) | `hardening.test.ts`: `"́a"`, `"a ́b"`, `"ab́"` válidos |
| 16 | La prueba "solo devuelve códigos declarados" exige que cada entrada falle; casos `join` con `undefined` y con `{ alias: 5 }` | `validation.test.ts` |

**Resultado:** `npm test` → 7 archivos, 69 pruebas, PASS; `npm run typecheck` → PASS.

**Desviación:** un caso de mi prueba inicial para REV-13 fallaba porque NFKC compone
`"á"` en `á` (1 carácter, bajo el mínimo de 2); se corrigió la prueba, no el código.

**Siguen abiertos:** REV-15 (aclarar A2, requiere aprobación explícita de Specification)
y REV-17 (documental).

### Aplicación de la aclaración v2.1 (2026-11-24)

- Cambio de Implementation Plan (registrado por separado): ninguno de pasos ni
  archivos; solo la verificación de AC-9 gana casos (plan v2.1).
- `shared/test/validation.test.ts`: la aserción de `stroke:start` con `"texto"` pasa
  de la prueba de `PAYLOAD_INVALID` a una prueba por evento con cinco payloads que no
  son objeto (`"texto"`, `42`, `null`, `undefined`, `[]`) para `stroke:start`,
  `stroke:points`, `stroke:end` y `chat:send`; se añade `session:resume` con `null`.
- Resultado: `npm test` → 7 archivos, 73 pruebas, PASS; `npm run typecheck` → PASS.
- Siguen abiertos: REV-17 (documental) y REV-18 (comentario de prueba), sin aprobar ni
  corregir en esta etapa.

## Testing

Commit revisado: `0ef6a67` (revisiones previas sobre `94df2aa`, `21a7bdf`, `895ae4b` y `d110fd3`).

| Verificación | Comando | Resultado |
|---|---|---|
| Unitarias (AC-1 a AC-9 y hallazgos corregidos) | `npm test` | PASS: 7 archivos, 73 pruebas |
| Tipos | `npm run typecheck` | PASS |
| Seguridad de dependencias | `npm audit` | PASS: 0 vulnerabilidades |
| Higiene del diff | `git ls-files` (`.env`, logs, `dist/`, `node_modules/`) | PASS |
| A2 frente al código | prueba temporal del revisor: 8 eventos × 7 payloads | PASS: sin diferencias |
| Caracteres de control | escaneo (revisor) | PASS: solo U+2028/U+2029 esperados en `hardening.test.ts` |
| Lint | — | NO EJECUTADA: no existe `lint` (decisión del usuario; deuda registrada) |
| Integración | — | NO APLICA: sin servidor (ver plan). Diferidas: cierre por mensaje grande (A3), rechazo por `MAX_TOTAL_POINTS` (A1) y `stroke:ended` en cierres forzados (A4) |
| Playwright | — | NO APLICA: sin UI ni servidor (ver plan) |
| Revisión visual | — | NO APLICA: sin cambios de UI |

## Review

**Veredicto: PASS** (2026-11-24, commit revisado `0ef6a67`). Quinta revisión
independiente, con subagente de contexto limpio y sin permisos de edición, sobre la
aclaración de A2 (`d110fd3..0ef6a67`). Sin hallazgos Critical, High ni Medium.

Cerrado y verificado: REV-15. El revisor probó `parseClientEvent` con
`null`, `undefined`, `"x"`, `42`, `[]`, `true` y `{}` en `session:join`, `session:resume`,
`stroke:start|points|end`, `chat:send`, `session:leave` y un evento desconocido: el
código coincide con A2 en todas las combinaciones.

Hallazgo nuevo: REV-19 (Low: faltan pruebas de payloads que no son objeto en
`session:join` y `session:resume`, y la enumeración de A2 omite `[]` y booleanos).
Desfases documentales del TASK corregidos en esta etapa (sin REV): estado de REV-15,
versión del plan en Publicación y cifra de pruebas en Testing.

| REV | Severidad | Categoría | Estado |
|---|---|---|---|
| [01](../reviews/REV-2026-11-24-pw-000-definicion-mvp-01.md) | Medium | ARCHITECTURE | Cerrado (A1) |
| [02](../reviews/REV-2026-11-24-pw-000-definicion-mvp-02.md) | Medium | PLAN / IMPLEMENTATION | Cerrado |
| [03](../reviews/REV-2026-11-24-pw-000-definicion-mvp-03.md) | Medium | SPECIFICATION | Cerrado (A2) |
| [04](../reviews/REV-2026-11-24-pw-000-definicion-mvp-04.md) | Medium | SPECIFICATION | Cerrado (A3) |
| [05](../reviews/REV-2026-11-24-pw-000-definicion-mvp-05.md) | Medium | SPECIFICATION | Cerrado (A4) |
| [06](../reviews/REV-2026-11-24-pw-000-definicion-mvp-06.md) | Low | SPECIFICATION | Cerrado (A5) |
| [07](../reviews/REV-2026-11-24-pw-000-definicion-mvp-07.md) | Low | SPECIFICATION | Cerrado (A6) |
| [08](../reviews/REV-2026-11-24-pw-000-definicion-mvp-08.md) | Low | IMPLEMENTATION | Cerrado |
| [09](../reviews/REV-2026-11-24-pw-000-definicion-mvp-09.md) | Low | IMPLEMENTATION | Cerrado |
| [10](../reviews/REV-2026-11-24-pw-000-definicion-mvp-10.md) | Low | IMPLEMENTATION | Cerrado |
| [11](../reviews/REV-2026-11-24-pw-000-definicion-mvp-11.md) | Low | IMPLEMENTATION | Cerrado (A2) |
| [12](../reviews/REV-2026-11-24-pw-000-definicion-mvp-12.md) | Low | IMPLEMENTATION | Cerrado |
| [13](../reviews/REV-2026-11-24-pw-000-definicion-mvp-13.md) | Low | IMPLEMENTATION | Cerrado |
| [14](../reviews/REV-2026-11-24-pw-000-definicion-mvp-14.md) | Medium | IMPLEMENTATION | Cerrado |
| [15](../reviews/REV-2026-11-24-pw-000-definicion-mvp-15.md) | Medium | SPECIFICATION / IMPLEMENTATION | Cerrado (aclaración de A2) |
| [16](../reviews/REV-2026-11-24-pw-000-definicion-mvp-16.md) | Low | IMPLEMENTATION | Cerrado |
| [17](../reviews/REV-2026-11-24-pw-000-definicion-mvp-17.md) | Low | ARCHITECTURE | Abierto (documental) |
| [18](../reviews/REV-2026-11-24-pw-000-definicion-mvp-18.md) | Low | IMPLEMENTATION | Abierto (comentario de prueba) |
| [19](../reviews/REV-2026-11-24-pw-000-definicion-mvp-19.md) | Low | IMPLEMENTATION | Abierto (cobertura y redacción de A2) |

## Publicación

PR [rolion/WSBoard#1](https://github.com/rolion/WSBoard/pull/1) listo para revisión
humana. El merge es manual.

- Plan: [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md) (v2.1)
- Decisiones: ADR de arquitectura, de contrato y de ajustes; DDR (ver `## Decisiones`).
- Limitaciones: sin lint, integración ni Playwright (no aplican aún).
- Abiertos (todos Low): REV-17, REV-18 y REV-19.
- A revisar por quien apruebe: la política de reinicio (ADR arquitectura D4), el tope
  `MAX_TOTAL_POINTS` y el mapeo de errores (ADR de ajustes A1, A2).

## Historial

| Fecha | Transición | Nota |
|---|---|---|
| 2026-11-24 | INVESTIGATION → DESIGN → ARCHITECTURE → PLANNING | Documentación inicial; Specification `READY` con supuestos S1–S6 |
| 2026-11-24 | PLANNING → ENGINEERING | Usuario aprueba S1–S6 y confirma Socket.IO (S1) frente a `ws`. ADR y DDR pasan a `Aceptado` |
| 2026-11-24 | ENGINEERING → REVIEW | `shared/` implementado; 35 pruebas y typecheck en PASS |
| 2026-11-24 | REVIEW → PUBLISH | Veredicto PASS en `94df2aa`; 11 hallazgos abiertos (5 Medium, 6 Low) en `docs/reviews/` |
| 2026-11-24 | PUBLISH → ENGINEERING → REVIEW | Corrección de REV-02, 08, 09, 10 y 11 (parcial); 51 pruebas y typecheck en PASS |
| 2026-11-24 | REVIEW → PUBLISH | Veredicto PASS en `21a7bdf`; REV-02, 08, 09, 10 cerrados; REV-12 y 13 (Low) nuevos |
| 2026-11-24 | PUBLISH → PLANNING | Usuario aprueba aplicar recomendaciones a REV-01, 03–07; Specification v2 y ADR de ajustes; plan v2 |
| 2026-11-24 | PLANNING → ENGINEERING → REVIEW | Enmienda aplicada en `shared/`; 61 pruebas y typecheck en PASS |
| 2026-11-24 | REVIEW → PUBLISH | Veredicto PASS en `895ae4b`; REV-01, 03–07 y 11 cerrados; REV-14 a 17 nuevos (2 Medium, 2 Low) |
| 2026-11-24 | PUBLISH → ENGINEERING → REVIEW | Corrección de REV-12, 13, 14 y 16; 69 pruebas y typecheck en PASS |
| 2026-11-24 | REVIEW → PUBLISH | Veredicto PASS en `d110fd3`; REV-12, 13, 14 y 16 cerrados; REV-18 (Low) nuevo |
| 2026-11-24 | PUBLISH → PLANNING | Usuario aprueba aclarar A2 (REV-15); Specification v2.1 |
| 2026-11-24 | PLANNING → ENGINEERING → REVIEW | Pruebas de AC-9 ampliadas; 73 pruebas y typecheck en PASS |
| 2026-11-24 | REVIEW → PUBLISH | Veredicto PASS en `0ef6a67`; REV-15 cerrado; REV-19 (Low) nuevo |
