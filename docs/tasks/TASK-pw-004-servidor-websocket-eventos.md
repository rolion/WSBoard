# TASK-pw-004-servidor-websocket-eventos — Servidor WebSocket y protocolo de eventos

- Trello: [PW-004](https://trello.com/c/YVBpAcr0/5-pw-004-servidor-websocket-y-protocolo-de-eventos) (lista "Backlog MVP")
- Rama: `task/TASK-pw-004-servidor-websocket-eventos`
- PR: [rolion/WSBoard#4](https://github.com/rolion/WSBoard/pull/4)
- Etapa actual: `REVIEW`
- Clasificación: `NEEDS_PLAN`
- Diseño requerido: No
- Plan: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) (COMPLETO)
- Specification readiness: `READY`

## Investigación

**Requisitos de la tarjeta** (sin checklists ni comentarios): implementar ciclo de
conexión, ingreso, presencia, dibujo y chat. Eventos "propuestos": `join`,
`join:error`, `presence:update`, `drawing:stroke:start|point|end`, `board:snapshot`,
`chat:message`, `disconnect`. Aceptación: (1) solo usuarios ingresados publican;
(2) el servidor distribuye a los demás conectados de la sala; (3) manejo de errores,
límites de tamaño, frecuencia y limpieza de sesiones; (4) contrato documentado y
probado. Dependencia: PW-001 (mergeada, `c57c3ab`).

**Estado del repositorio** (`HEAD` = `c57c3ab`):

- El contrato ya está decidido y **aceptado** en PW-000: eventos, payloads, errores,
  `seq`, snapshot, gracia de reconexión y límites en
  [ADR contrato](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md) y
  [ADR ajustes](../adr/ADR-pw-000-definicion-mvp-ajustes-revision.md) (A1–A6, prevalece).
  Los nombres de la tarjeta son una propuesta previa; **rige el ADR** (ver tabla abajo).
- `shared/` está completo y sin cambios necesarios: `CLIENT_EVENT_SCHEMAS`,
  `CLIENT_EVENTS`, `SERVER_EVENTS` (`shared/src/events.ts:13-39`), tipos de
  payloads, acks y `Snapshot` (`shared/src/types.ts:37-77`), `parseClientEvent` con el
  mapeo de errores A2 (`shared/src/validation.ts:14-34`), límites
  (`shared/src/limits.ts:5-24`), esquemas con normalización NFKC del alias y
  redondeo de coordenadas (`shared/src/schemas.ts:33,47-52`).
- `server/src/app.ts:13-52` ya crea Socket.IO solo `websocket`, con
  `maxHttpBufferSize = MAX_MESSAGE_BYTES` (`:25`) y validación de `Origin`
  (`:27-30`). **No hay** estado de sala ni manejadores de eventos: la conexión se
  acepta y no ocurre nada más. `server/src/index.ts:4-9` arranca con `loadConfig`.
- Pruebas existentes de servidor: `config`, `server`, `connection`
  (`server/test/`), con `socket.io-client` ya declarado como dependencia de desarrollo
  (`server/package.json:18`).
- No existe lógica de dominio ni cliente que consuma el protocolo (el cliente de PW-001
  solo conecta y desconecta).
- Otras ramas locales (`task/TASK-pw-002-acceso-alias-unico`) no tienen commits
  propios: no hay solapamiento.

**Correspondencia tarjeta → contrato vigente**

| Tarjeta (propuesta) | Contrato (ADR) |
|---|---|
| `join` / `join:error` | `session:join` con ack `{ok:true,…}` o `{ok:false,error}`; además `session:resume`, `session:leave` |
| `presence:update` | `presence:joined`, `presence:status`, `presence:left` |
| `drawing:stroke:start/point/end` | `stroke:start`, `stroke:points` (lotes ≤ 64), `stroke:end`; difusión `stroke:started/appended/ended` y `seq:advance` |
| `board:snapshot` | `Snapshot` en el ack de `join`/`resume` |
| `chat:message` | `chat:send` (ack) → difusión `chat:message` |
| `disconnect` | evento nativo de Socket.IO; pasa a `reconnecting` y gracia de 30 s |

**Veredicto**

- `NEEDS_PLAN`: implementa un contrato ya aceptado sin cambiarlo (eventos, `seq`,
  sincronización y autoridad del estado quedan como en el ADR vigente). No requiere
  ADR nuevo. Plan **COMPLETO** porque introduce el estado autoritativo, la máquina de
  estados de sesión y la frontera dominio/transporte.
- Diseño: **no requerido**. No cambia pantallas ni estados visibles; los textos y
  estados de la UI están en el
  [DDR de PW-000](../design/DDR-pw-000-definicion-mvp-experiencia.md) y llegan con el
  cliente.
- Si al implementar apareciera un cambio en eventos, `seq` o sincronización, vuelve a
  `delivery-start` con un ADR que reemplace al vigente.

**Supuestos** (interpretaciones del ADR; no lo modifican)

| ID | Supuesto |
|---|---|
| S-1 | Eventos con ack (`session:join`, `session:resume`, `chat:send`): el error se devuelve **solo por el ack** si el cliente lo pasó; sin ack, se emite el evento `error`. Los eventos sin ack (`stroke:*`) siempre emiten `error`. Aplica también a `NOT_JOINED` y `RATE_LIMITED` |
| S-2 | `session:resume` en un socket que ya está unido → `ALREADY_JOINED` (simétrico a `join`) |
| S-3 | Tasa: `stroke:*` se cuenta por socket en ventana de 1 s (60), `chat:send` por participante en ventana deslizante (5 por 10 s, sobrevive a `resume`). La tasa se comprueba **antes** de validar el payload, y cuenta también los intentos inválidos |
| S-4 | Un evento `stroke:*` o `chat:send` de un socket no unido recibe `NOT_JOINED` antes que la comprobación de tasa |
| S-5 | `presence:status` se difunde también a todos cuando un participante pasa de `connected` a `reconnecting`; el `resume` de un participante ya `connected` (reemplazo de socket) no difunde nada |
| S-6 | Heartbeat de Socket.IO con valores por defecto (`pingInterval` 25 s, `pingTimeout` 20 s); un socket muerto se detecta como `disconnect` y entra en gracia. No se añaden constantes nuevas a `shared/` |
| S-7 | `ROOM_FULL` cuenta participantes activos y en gracia (30 en total) |
| S-8 | Un socket que se desconecta sin haberse unido no crea ni modifica estado |
| S-9 | Precedencia en `session:join`: `ALREADY_JOINED` → esquema (`PROTOCOL_MISMATCH`/`ALIAS_INVALID`/`PAYLOAD_INVALID`) → `ALIAS_TAKEN` → `ROOM_FULL`. `ALREADY_JOINED` va primero para que un socket ya unido no reciba `ALIAS_TAKEN` por su propio alias |
| S-10 | Los eventos con ack (`session:join`, `session:resume`, `chat:send`) enviados **sin** callback se rechazan con `error PAYLOAD_INVALID` y no cambian el estado (el cliente no podría conocer el resultado). Se comprueba después de `NOT_JOINED` |

## Specification

**Alcance:** servidor autoritativo en memoria que implementa el contrato v1 para la
sala única `main`: `session:join`, `session:resume`, `session:leave`, `stroke:start`,
`stroke:points`, `stroke:end`, `chat:send`; difusión `presence:*`, `stroke:*`,
`chat:message`, `seq:advance`; evento `error`; snapshot; límites de tamaño, de
frecuencia y de capacidad; gracia de reconexión y limpieza de sesiones.

**Fuera de alcance:** cliente (pantallas, Canvas, reconexión automática, cola de eventos
del cliente), Playwright, persistencia, varias salas, autenticación, métricas,
despliegue, cambios en `shared/`.

**Criterios de aceptación**

- **AC-1 Solo ingresados publican.** Antes de unirse, cualquier evento C→S distinto de
  `session:join`/`session:resume` recibe `NOT_JOINED`, no cambia el estado y no se
  difunde. Tras `session:leave` o `SESSION_EXPIRED` el socket vuelve a ese estado.
- **AC-2 Ingreso.** `session:join` valida protocolo, alias (normalizado, único sin
  distinguir mayúsculas entre activos y en gracia) y capacidad (30). En éxito, ack
  `{ok:true, sessionToken, snapshot}` y `presence:joined` a los demás; `snapshot.seq`
  incluye ese evento y `snapshot.selfId` es el id del nuevo participante. Errores:
  `PROTOCOL_MISMATCH`, `ALIAS_INVALID`, `ALIAS_TAKEN`, `ROOM_FULL`, `ALREADY_JOINED`,
  `PAYLOAD_INVALID` (mapeo A2).
- **AC-3 Trazos.** `stroke:start/points/end` validados y difundidos como
  `stroke:started/appended/ended` a **todos los demás** de la sala; el autor recibe
  `seq:advance` con el `seq` correspondiente. Un trazo abierto por participante
  (`STROKE_LIMIT`); id único (`STROKE_INVALID` si se repite); solo el autor modifica su
  trazo; los puntos se guardan normalizados por el esquema.
- **AC-4 Chat.** `chat:send` con ack `{ok:true}`; difunde `chat:message` a **todos**
  incluido el emisor; `ts` e `id` los fija el servidor; texto plano sin transformar más
  allá del esquema; historial de 200 (descarta el más antiguo).
- **AC-5 Sincronización y orden.** El snapshot incluye participantes, trazos (incluidos
  los abiertos con sus puntos actuales), chat, `seq` y `epoch`. Todo evento difundido
  tras el snapshot lleva `seq > snapshot.seq`. `seq` es global, monotónico y sin huecos
  para cada destinatario (con `seq:advance` para el autor).
- **AC-6 Límites.** Más de `MAX_STROKES` trazos o de `MAX_TOTAL_POINTS` puntos →
  `BOARD_FULL` (en `stroke:start` no se crea el trazo; en `stroke:points` se rechaza el
  lote entero y el trazo se cierra). Más de `MAX_POINTS_PER_STROKE` → `STROKE_INVALID` y
  cierre del trazo. Cada cierre forzado difunde `stroke:ended` con `seq` nuevo (A4).
  Más de `RATE_STROKE_EVENTS`/s por socket o `RATE_CHAT` → evento descartado y
  `RATE_LIMITED` sin desconectar. Un mensaje > `MAX_MESSAGE_BYTES` cierra el socket y no
  cambia el estado.
- **AC-7 Errores.** Todo fallo de validación usa el código de `parseClientEvent`. Un
  payload inválido, un evento desconocido o un nombre de evento no válido nunca lanza una
  excepción no controlada, no cambia el estado ni consume `seq`; el servidor sigue
  atendiendo a los demás. `message` es solo diagnóstico.
- **AC-8 Sesiones.** Desconexión de un participante unido → `reconnecting` y
  `presence:status`; `session:resume` dentro de 30 s devuelve snapshot completo y vuelve
  a `connected`; un `resume` desde otro socket sustituye al anterior sin afectar a la
  presencia; token desconocido, caducado o de otra instancia (otro `epoch`) →
  `SESSION_EXPIRED`. Vencida la gracia: cierre del trazo abierto (`stroke:ended`),
  `presence:left` con `reason: "timeout"`, alias liberado. `session:leave` libera el alias
  al instante (`presence:left` con `reason: "leave"`) y cierra el socket. El
  `sessionToken` no aparece en ninguna difusión.
- **AC-9 Contrato documentado y probado.** El README documenta el protocolo (tabla
  tarjeta→contrato, enlace al ADR como fuente normativa, orden de comprobaciones y
  semántica de errores/acks); una prueba de contrato ejercita cada evento de
  `CLIENT_EVENTS` y `SERVER_EVENTS` y cada `ErrorCode`.

**Casos límite:** alias idénticos salvo mayúsculas/NFKC; dos `join` simultáneos con el
mismo alias (solo uno gana); `join` con la sala llena y alias duplicado (precedencia:
ver S-9);
`stroke:start` con id repetido o reutilizado tras desconexión; participante en gracia
con trazo abierto (permanece abierto hasta cerrarse); `stroke:points` de un trazo ajeno
o cerrado; lote que cruza exactamente el tope por trazo o por sala; `resume` con token
de un participante ya eliminado; `resume` con el participante conectado (pestaña
duplicada); cliente que se desconecta entre `join` y su ack; entrada tardía mientras otro
dibuja; sala vacía que conserva su estado; `session:leave` con trazo abierto; mensajes en
el límite exacto (16 384 bytes) y por encima (16 385); evento sin ack donde se espera ack.

## Test Specification

| Criterio | Verificación | Tipo |
|---|---|---|
| AC-1 | `server/test/room.session.test.ts` (sala: operaciones sin sesión); `server/test/protocol.session.test.ts` (cliente real: `stroke:start`/`chat:send` antes de unirse → `NOT_JOINED`; tras `leave`) | Unitaria + integración |
| AC-2 | `room.session.test.ts` (alias, capacidad con 30, precedencia); `protocol.session.test.ts` (ack, `presence:joined` al otro cliente, `snapshot.seq`, `ALIAS_TAKEN` entre mayúsculas, `ROOM_FULL` con 31 clientes, `ALREADY_JOINED`) | Unitaria + integración |
| AC-3 | `room.strokes.test.ts`; `protocol.strokes.test.ts` (dos clientes: B recibe `stroke:started/appended/ended`, A recibe `seq:advance`; `STROKE_LIMIT`, id duplicado, trazo ajeno) | Unitaria + integración |
| AC-4 | `room.chat.test.ts` (historial de 200, `ts`/`id` del servidor); `protocol.chat.test.ts` (emisor y receptor reciben `chat:message`; ack) | Unitaria + integración |
| AC-5 | `protocol.sync.test.ts`: entrada tardía con trazo abierto y chat previos; tercer cliente dibuja durante el `join` y se verifican `seq > snapshot.seq` y ausencia de huecos en cada cliente | Integración |
| AC-6 | `room.limits.test.ts` (topes de trazos, puntos por trazo y por sala con constantes reducidas por inyección o construidos en bloque, cierre forzado A4); `rate-limit.test.ts`; `protocol.limits.test.ts` (ráfaga de 61 `stroke:*`, 6 `chat:send`, mensaje de 16 385 bytes cierra el socket y el estado no cambia) | Unitaria + integración |
| AC-7 | `protocol.errors.test.ts`: payloads `null`/cadena/array/objeto con campos extra, evento desconocido, nombre de evento no cadena, ack ausente; servidor operativo después de cada caso | Integración |
| AC-8 | `room.session.test.ts` con temporizadores falsos (gracia 30 s, cierre de trazo, `presence:left timeout`, alias liberado); `protocol.reconnect.test.ts` (resume < 30 s, reemplazo de socket, `SESSION_EXPIRED` con token falso y con segunda instancia de servidor, `leave`, token ausente en difusiones) | Unitaria + integración |
| AC-9 | `server/test/contract.test.ts` (cobertura de eventos y códigos de error); revisión del README | Integración + revisión |
| Todos | `npm run lint && npm run typecheck && npm test && npm run build` | Comandos |

**Playwright: no corresponde.** La tarea no toca el cliente; los escenarios de
colaboración (dos participantes, entrada tardía, reconexión) se cubren con varios clientes
`socket.io-client` independientes sobre un servidor real, que ya son sockets separados. Los
E2E con dos contextos de navegador serán obligatorios cuando exista el cliente de pizarra y
chat (y requerirán aprobar Playwright como dependencia).

## Implementation Plan

Ver [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) (COMPLETO, v1).

## Decisiones

No hay ADR ni DDR nuevos: el contrato, `seq`, la sincronización y la autoridad del estado
quedan como en los ADR de PW-000. Decisiones técnicas rutinarias (detalle en el plan):

- Separar dominio (`Room`, síncrono, sin Socket.IO) de transporte (`transport.ts`); la
  sala emite por una interfaz `Outbox` para probarla sin sockets.
- Reloj y temporizadores controlables en pruebas con `vi.useFakeTimers()`; sin nuevas
  constantes en `shared/` (S-6).
- Sin dependencias nuevas: `socket.io`, `socket.io-client`, `zod` (vía `shared`) y Vitest ya
  están aprobadas e instaladas.
- La ventana de `RATE_STROKE_EVENTS` (1 s) está fija en `server/src/room/room.ts`: `shared/` solo define el número y S-6 impide añadir constantes (REV-06).
- Identificadores: `participantId` y `ChatMessage.id` con `crypto.randomUUID`/corto opaco;
  `sessionToken` con 16 bytes aleatorios (`crypto.randomBytes`, base64url), nunca derivado
  del alias; `epoch` con `randomUUID` al crear la sala.

## Implementación

**Cambios**

- `server/src/room/room.ts`: `Room`, estado autoritativo síncrono (participantes, trazos, chat, `seq`, `epoch`, tokens, gracia de reconexión, límites A1/A4, `seq:advance`, snapshot). Límites inyectables solo para pruebas (`RoomOptions.limits`).
- `server/src/room/outbox.ts` (interfaz de salida) y `rate-limit.ts` (ventana deslizante con reloj inyectable).
- `server/src/transport.ts`: `attachRoom(io, options?)`; un único `socket.onAny` con el orden de comprobaciones del plan, acks/`error`, `session:leave`, reemplazo de socket en `resume`, `try/catch` que nunca propaga.
- `server/src/app.ts`: crea la sala, la expone como `app.room`, acepta `roomOptions` y cancela temporizadores en `close()`.
- `README.md`: sección "Protocolo WebSocket".
- Sin cambios en `shared/`, sin dependencias nuevas.

**Criterios cubiertos**

| Criterio | Verificación |
|---|---|
| AC-1 | `room.strokes.test.ts` (sin unirse), `protocol.session.test.ts` (NOT_JOINED, estado intacto) |
| AC-2 | `room.session.test.ts`, `protocol.session.test.ts` (30+1 clientes, alias, protocolo, ALREADY_JOINED, sin ack) |
| AC-3 | `room.strokes.test.ts`, `protocol.strokes.test.ts` |
| AC-4 | `room.chat.test.ts`, `protocol.chat.test.ts` |
| AC-5 | `protocol.sync.test.ts` (entrada tardía con trazo abierto; `seq` sin huecos con tres clientes), `room.strokes.test.ts` |
| AC-6 | `room.limits.test.ts`, `rate-limit.test.ts`, `protocol.limits.test.ts` (ráfaga, 16 385 bytes cierra, 16 384 no) |
| AC-7 | `protocol.errors.test.ts` |
| AC-8 | `room.session.test.ts` (temporizadores falsos: gracia, cierre de trazo, `timeout`), `protocol.reconnect.test.ts` |
| AC-9 | `contract.test.ts`; README |

**Pruebas ejecutadas:** `npm test` → shared 75, server 67, client 10, PASS (server repetido 5 veces sin fallos); `npm run lint`, `typecheck`, `build` PASS; `npm audit` 0 vulnerabilidades.

**Desviaciones**

- Se añadió el supuesto S-10 (eventos con ack sin callback → `PAYLOAD_INVALID`); no cambia el ADR.
- Corrección tras la revisión 1 (`b339bc4`): REV-05 cambió el código (`transport.ts`: los `stroke:*` ignoran el callback, S-1 cumplido también con ack); REV-01 a REV-04, 07 y 08 son pruebas y README (contigüidad estricta de `seq` en A, B y C; nombre de evento numérico y `null`/objeto; token ausente tras `resume` y `leave`; precedencia `STROKE_LIMIT`/`STROKE_INVALID`; borde de 16 385 bytes). REV-06 queda registrado en Decisiones. Pruebas del servidor: 72.
- La caducidad de la gracia (30 s) se prueba solo en unitarias con temporizadores falsos; en integración no se simulan para no falsear los temporizadores de Socket.IO. La Test Specification de AC-8 pedía integración para `resume` dentro de la gracia, `SESSION_EXPIRED`, `leave` y reemplazo (cubiertos); el vencimiento real queda en unitarias.
- `MAX_STROKES`, `MAX_TOTAL_POINTS` y puntos por trazo se prueban con límites reducidos por inyección (`RoomOptions.limits`); los valores de `shared/` no se simulan al tope.
- `createAppServer` recibe un segundo parámetro opcional `roomOptions` (solo pruebas).

**Deuda técnica**

- Las esperas de integración usan sondeo de estado observable (`until`) con tope de 3 s; no hay esperas fijas, salvo un `setImmediate` en `protocol.sync.test.ts`.
- Un cliente puede provocar eventos `error` `RATE_LIMITED` a la velocidad de su socket (riesgo registrado en el plan).
- El ack de `join`/`resume` puede superar `MAX_MESSAGE_BYTES` en el peor caso (~8 MB): el límite aplica a mensajes entrantes. Medición pendiente (ADR de ajustes A1).
- Sin comprobación en navegador ni Playwright (el cliente aún no consume el protocolo).

## Testing

Revisión 1, commit `b339bc4` (revisor independiente, subagente de contexto limpio sin edición).

| Verificación | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | PASS |
| Tipos | `npm run typecheck` | PASS |
| Unitarias e integración | `npm test` | PASS: shared 75, server 67, client 10; server ×3 sin flakiness |
| Build | `npm run build` | PASS |
| Dependencias | `npm audit` | PASS: 0 vulnerabilidades |
| Higiene del diff | `git ls-files`, grep de secretos | PASS |
| AC-1 a AC-9 | pruebas del TASK | Código conforme; verificación incompleta en AC-5 y AC-7 (REV-01, REV-02) |
| Playwright | — | NO APLICA (ver Test Specification) |
| Revisión visual | — | NO APLICA (sin UI) |

## Review

**Veredicto 1: FAIL** (2026-11-25, commit `b339bc4`). El revisor no encontró defectos de correctitud en `server/src/`; falla porque hay verificaciones exigidas por la Test Specification sin ejecutar (AC-5 sin comprobar ausencia de huecos en A y B; AC-7 sin nombre de evento no cadena). Devuelto a `delivery-build`.

| REV | Severidad | Categoría | Criterio | Estado |
|---|---|---|---|---|
| [01](../reviews/REV-2026-11-25-pw-004-servidor-websocket-eventos-01.md) | Medium | IMPLEMENTATION | AC-5 | Corregido, pendiente de revisión 2 |
| [02](../reviews/REV-2026-11-25-pw-004-servidor-websocket-eventos-02.md) | Medium | IMPLEMENTATION | AC-7 / A2 | Corregido, pendiente de revisión 2 |
| [03](../reviews/REV-2026-11-25-pw-004-servidor-websocket-eventos-03.md) | Low | IMPLEMENTATION | AC-8 | Corregido, pendiente de revisión 2 |
| [04](../reviews/REV-2026-11-25-pw-004-servidor-websocket-eventos-04.md) | Low | IMPLEMENTATION | AC-3 | Corregido, pendiente de revisión 2 |
| [05](../reviews/REV-2026-11-25-pw-004-servidor-websocket-eventos-05.md) | Low | IMPLEMENTATION | S-1 | Corregido, pendiente de revisión 2 |
| [06](../reviews/REV-2026-11-25-pw-004-servidor-websocket-eventos-06.md) | Low | ARCHITECTURE | AC-6 | Corregido, pendiente de revisión 2 |
| [07](../reviews/REV-2026-11-25-pw-004-servidor-websocket-eventos-07.md) | Low | IMPLEMENTATION | AC-6 | Corregido, pendiente de revisión 2 |
| [08](../reviews/REV-2026-11-25-pw-004-servidor-websocket-eventos-08.md) | Low | IMPLEMENTATION | AC-9 | Corregido, pendiente de revisión 2 |

## Publicación

_(lo completa `delivery-publish`)_

## Historial

| Fecha | Transición | Nota |
|---|---|---|
| 2026-11-25 | INVESTIGATION → PLANNING | Tarjeta leída; el ADR de PW-000 ya fija el contrato; sin preguntas de producto abiertas; supuestos S-1 a S-8 registrados; Specification `READY` |
| 2026-11-25 | PLANNING → ENGINEERING | PR abierto (#4); se invoca `delivery-build` |
| 2026-11-25 | ENGINEERING → REVIEW | Servidor implementado; lint, typecheck, build y 152 pruebas en PASS; sin cambios en `shared/`; supuesto S-10 añadido |
| 2026-11-25 | REVIEW → ENGINEERING | Veredicto FAIL en `b339bc4`: REV-01 y REV-02 (Medium) y REV-03 a REV-08 (Low), todos IMPLEMENTATION salvo REV-06 (ARCHITECTURE, solo registro) |
| 2026-11-25 | ENGINEERING → REVIEW | REV-01 a REV-08 atendidos; lint, typecheck y 72 pruebas del servidor en PASS (×3); se invoca `delivery-publish` |
