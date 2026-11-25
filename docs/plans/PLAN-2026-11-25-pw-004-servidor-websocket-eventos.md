# PLAN-2026-11-25-pw-004-servidor-websocket-eventos

- Modo: **COMPLETO** (introduce el estado autoritativo de la sala, la transición de sesiones y la frontera entre dominio y transporte)
- Versión: 1
- TASK: [TASK-pw-004-servidor-websocket-eventos](../tasks/TASK-pw-004-servidor-websocket-eventos.md)
- Decisiones aplicables: [ADR arquitectura](../adr/ADR-pw-000-definicion-mvp-arquitectura.md) (D2–D8), [ADR contrato](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md), [ADR ajustes](../adr/ADR-pw-000-definicion-mvp-ajustes-revision.md) (A1–A6, prevalece)

## Objetivo

Implementar en `server/` el contrato v1 ya aceptado: ingreso, presencia, trazos,
chat, snapshot, límites, tasas y limpieza de sesiones, con el servidor como única
autoridad del estado y de `seq`.

## Alcance

Solo `server/` (y documentación). `shared/` no cambia. Sin cliente, sin Canvas, sin
Playwright (ver TASK).

## Arquitectura interna

Frontera **dominio / transporte**: la sala no conoce Socket.IO.

| Módulo | Responsabilidad |
|---|---|
| `server/src/room/room.ts` | `Room`: estado (participantes, trazos, chat, `seq`, `epoch`) y operaciones `join`, `resume`, `leave`, `disconnect`, `strokeStart/Points/End`, `chatSend`. Cada operación devuelve un resultado `{ ok, ... }` y emite por una interfaz `Outbox` |
| (constructor de `Room`) | Recibe `limits` opcionales que sustituyen a los de `shared/` solo en pruebas (topes de trazos y puntos reducidos); en producción siempre los de `shared/src/limits.ts` |
| `server/src/room/outbox.ts` | Interfaz `Outbox`: `broadcast(event, payload, { exceptParticipantId? })`, `toParticipant(id, event, payload)`. Implementación de prueba que registra llamadas |
| `server/src/room/rate-limit.ts` | Limitador de ventana (inyecta el reloj); uno por socket (trazos) y uno por participante (chat) |
| `server/src/transport.ts` | `attachRoom(io, room)`: enlaza sockets con la sala, `parseClientEvent`, acks, evento `error`, `NOT_JOINED`, rate limit, `disconnect` |
| `server/src/app.ts` | Crea `Room` y llama a `attachRoom`; `close()` cancela temporizadores |

### Invariantes

1. **Serialidad**: cada operación de `Room` es síncrona; `seq` se asigna y se difunde
   en el mismo turno. No hay `await` entre mutar el estado y emitir.
2. `seq` empieza en 0, crece de uno en uno y solo lo consumen los eventos de
   difusión (`presence:*`, `stroke:*`, `chat:message`). `seq:advance` reutiliza el `seq`
   del evento que sustituye.
3. Un evento rechazado no cambia el estado ni consume `seq` (salvo el cierre forzado
   de A4, que sí difunde `stroke:ended`).
4. `totalPoints` = suma de los puntos de todos los trazos; se mantiene
   incrementalmente y nunca supera `MAX_TOTAL_POINTS`. `strokes.length <= MAX_STROKES`.
5. Cada participante tiene como máximo un trazo abierto; los trazos abiertos
   pertenecen a participantes existentes (conectados o en gracia). Al eliminar un
   participante se cierran antes sus trazos.
6. El alias es único por clave `normalizado.toLowerCase()` entre participantes
   activos o en gracia; se libera al eliminar al participante.
7. A lo sumo un socket vinculado por participante; el `sessionToken` solo existe en
   el ack de `join` y en la sala (nunca en difusiones ni logs).
8. El snapshot se construye en el mismo turno en que el socket entra a la sala
   Socket.IO, tras asignar el `seq` de `presence:joined` y emitirlo.

### Máquina de estados del participante

```
(sin sesión) --join--> connected --disconnect--> reconnecting --resume<=30s--> connected
connected|reconnecting --leave--> (eliminado, presence:left "leave")
reconnecting --gracia vencida--> (eliminado, stroke:ended si había trazo, presence:left "timeout")
connected --resume desde otro socket--> connected (socket anterior desconectado)
```

### Orden de comprobaciones por evento C→S

0. `session:join`: `ALREADY_JOINED` → esquema → `ALIAS_TAKEN` → `ROOM_FULL` (S-9); `session:resume` en socket unido → `ALREADY_JOINED` (S-2).
1. Socket sin unirse y evento distinto de `session:join`/`session:resume` → `NOT_JOINED`.
2. Tasa (`stroke:*` por socket; `chat:send` por participante) → `RATE_LIMITED`.
3. `parseClientEvent` (mapeo A2) → código del error.
4. Reglas de dominio de la sala (unicidad, topes, trazo abierto, etc.).

## Pasos

| # | Paso | Archivos |
|---|---|---|
| 1 | `Outbox` y limitador de tasa con reloj inyectable + pruebas unitarias | `server/src/room/outbox.ts`, `rate-limit.ts`, `server/test/rate-limit.test.ts` |
| 2 | `Room`: `join`/`leave`/`resume`/`disconnect`, presencia, `seq`, snapshot, gracia con temporizadores | `server/src/room/room.ts` |
| 3 | `Room`: trazos (`start`/`points`/`end`), topes, cierre forzado (A4), `seq:advance` | `server/src/room/room.ts` |
| 4 | `Room`: chat (historial, saneado de texto vía esquema), tasa de chat | `server/src/room/room.ts` |
| 5 | Pruebas unitarias de `Room` con `Outbox` falso y `vi.useFakeTimers()` | `server/test/room.*.test.ts` |
| 6 | `transport.ts`: enlace Socket.IO, acks, `error`, `NOT_JOINED`, tasa por socket, `leave`, `disconnect`, reemplazo de socket en `resume`; conectar en `app.ts` | `server/src/transport.ts`, `app.ts` |
| 7 | Pruebas de integración con `socket.io-client` (varios clientes, entrada tardía, reconexión, límites, mensaje grande) | `server/test/protocol.*.test.ts` |
| 8 | Prueba de contrato: todo evento de `CLIENT_EVENTS`/`SERVER_EVENTS` y todo `ErrorCode` se ejercita al menos una vez | `server/test/contract.test.ts` |
| 9 | README: sección de protocolo (tabla tarjeta→contrato, enlace al ADR) y `CLAUDE.md` si cambian comandos | `README.md` |
| 10 | Verificación completa: `lint`, `typecheck`, `test`, `build`, `npm audit` | — |

Dependencias: 2 → 3 → 4 (mismo archivo, secuencial); 5 tras cada uno de 2–4;
6 tras 2–4; 7 y 8 tras 6; 10 al final. El paso 1 es independiente.

## Verificación por criterio

Ver la tabla de la *Test Specification* del TASK (AC-1 a AC-9).

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Carrera entre snapshot y eventos en vivo | Invariantes 1 y 8; prueba de integración con un tercer cliente que dibuja mientras otro entra, comprobando `seq > snapshot.seq` y ausencia de huecos |
| Pruebas con temporizadores frágiles (gracia 30 s) | `vi.useFakeTimers()` en unitarias; en integración, la gracia se prueba con temporizadores falsos que avanzan sin dormir |
| Desconexión del socket antiguo en `resume` dispara limpieza del participante vigente | El `disconnect` solo actúa si el socket sigue vinculado al participante (invariante 7); prueba dedicada |
| Inundación de eventos `error` con `RATE_LIMITED` | Acotada por `MAX_MESSAGE_BYTES` y la velocidad del propio socket; se registra como límite conocido, sin mitigación adicional en el MVP |
| Snapshot grande (hasta ~8 MB) supera `MAX_MESSAGE_BYTES` en el ack | `maxHttpBufferSize` aplica a mensajes **entrantes**; el ack saliente no se limita. Se documenta y se mide en una tarea de rendimiento (ADR ajustes A1) |
| Reinicio del servidor | `epoch` nuevo por instancia (`randomUUID`); prueba con dos instancias consecutivas |

Reversión: el cambio es aditivo en `server/`; revertir el PR devuelve el servidor al
estado de PW-001 sin migraciones (no hay persistencia).

## Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1 | 2026-11-25 | Plan inicial |
