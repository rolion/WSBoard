# ADR-pw-000-definicion-mvp-ajustes-revision — Ajustes al contrato tras la revisión (v1.1)

- Estado: Aceptado (2026-11-24; aprobado por el usuario en chat: "adelante, aplica las recomendaciones")
- Tarea: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Enmienda (sin reemplazar el resto de su contenido):
  - [ADR de contrato de eventos](ADR-pw-000-definicion-mvp-contrato-eventos.md)
  - [ADR de arquitectura](ADR-pw-000-definicion-mvp-arquitectura.md) (D5, D7, D8)
- Aclaración posterior: A2 (precedencia del mapeo por evento), REV-15, aprobada por el usuario el 2026-11-24 ("Aclarar A2").
- Origen: hallazgos REV-01, 03, 04, 05, 06, 07 y el resto de 11
  ([docs/reviews](../reviews)) de la primera revisión de `delivery-publish`.
- `PROTOCOL_VERSION` sigue en 1: el contrato aún no tiene implementaciones
  desplegadas, así que los cambios no rompen ningún cliente real.

## Decisiones

### A1. Tope agregado de puntos por sala (REV-01)

- Nueva constante `MAX_TOTAL_POINTS = 500 000`: suma de los puntos de todos
  los trazos de la sala.
- Cota del snapshot: con ~16 bytes por punto en JSON (`[0.1234,0.5678],`) el
  peor caso ronda **8 MB**, más chat y participantes. Los topes por trazo
  (5 000) y por sala (5 000 trazos) siguen vigentes; el que se alcance primero
  manda.
- `stroke:start`: si la sala ya tiene `MAX_STROKES` trazos, o añadir los puntos
  superaría `MAX_TOTAL_POINTS` → `BOARD_FULL`, no se crea el trazo.
- `stroke:points`: si el lote superaría `MAX_TOTAL_POINTS` → se rechaza **todo
  el lote**, el emisor recibe `BOARD_FULL` y el trazo se cierra (A4).
- **Alternativa descartada:** recalibrar solo `MAX_STROKES`/`MAX_POINTS_PER_STROKE`.
  Obliga a recortar trazos largos legítimos para proteger el peor caso.

### A2. Mapeo de errores de validación (REV-03)

Cuando falla el esquema de un evento C→S, el código es:

| Evento | Condición | Código |
|---|---|---|
| `session:join` | falla `protocol` | `PROTOCOL_MISMATCH` |
| `session:join` | falla `alias` | `ALIAS_INVALID` |
| `stroke:start`, `stroke:points`, `stroke:end` | cualquier fallo de esquema | `STROKE_INVALID` |
| `chat:send` | cualquier fallo de esquema | `CHAT_INVALID` |
| `session:resume` | cualquier fallo de esquema | `PAYLOAD_INVALID` |
| `session:join` | falla otro campo, o el payload no es un objeto (`null`, `undefined`, cadena, número) | `PAYLOAD_INVALID` |
| evento desconocido o nombre de evento que no es una cadena | — | `PAYLOAD_INVALID` |

Si `join` falla a la vez en `protocol` y `alias`, gana `PROTOCOL_MISMATCH`.

**Precedencia (aclaración, REV-15).** El mapeo por evento prevalece sobre cualquier
regla general: en `stroke:start`, `stroke:points`, `stroke:end` y `chat:send`,
**todo** fallo de esquema, incluido un payload que no es un objeto, devuelve
`STROKE_INVALID` o `CHAT_INVALID`. `PAYLOAD_INVALID` queda reservado para
`session:resume`, para `session:join` cuando no falla `protocol` ni `alias` (incluido
un payload que no es un objeto) y para eventos desconocidos.
`shared/` expone `parseClientEvent(event, payload)`, que valida y devuelve
`{ ok: true, data }` o `{ ok: false, code, message }`; el servidor no
reimplementa el mapeo.

`STROKE_LIMIT` significa exclusivamente "ya tienes un trazo abierto"
(`MAX_OPEN_STROKES_PER_PARTICIPANT`). El exceso de puntos de un trazo usa
`STROKE_INVALID`; el de la sala, `BOARD_FULL`.

### A3. Mensajes de tamaño excesivo (REV-04)

Se elimina la regla "3 mensajes inválidos de tamaño excesivo seguidos
desconectan". `MAX_MESSAGE_BYTES` se aplica con `maxHttpBufferSize` de
Socket.IO: **un mensaje que lo supera cierra la conexión del socket**
(comportamiento del transporte). El cliente lo trata como una desconexión y
reintenta con `session:resume`. Esto se verifica con una prueba de integración
en la tarea del servidor; en `shared/` solo existe la constante.

### A4. Cierre forzado de un trazo (REV-05)

Todo cierre de un trazo abierto que no provenga de `stroke:end` **difunde
`stroke:ended`** con un `seq` nuevo, a todos menos al autor (que recibe
`seq:advance` si sigue conectado). Casos:

- exceso de `MAX_POINTS_PER_STROKE` (error `STROKE_INVALID` al autor),
- exceso de `MAX_TOTAL_POINTS` (error `BOARD_FULL` al autor),
- caducidad de `RECONNECT_GRACE_MS` del autor desconectado,
- salida voluntaria o `timeout` del autor (se cierra antes de `presence:left`).

El trazo queda en la sala con los puntos aceptados hasta ese momento.

### A5. Eventos y valores sin uso (REV-06)

- Se elimina `reason: "replaced"` de `presence:left`: el reemplazo de socket
  por `resume` no cambia la presencia. Valores válidos: `"leave"` | `"timeout"`.
- Se elimina `lastSeq` del payload de `session:resume`: el servidor siempre
  responde con snapshot completo. `lastSeq` sigue existiendo solo como estado
  interno del cliente.

### A6. `seq:advance` en la tabla (REV-07)

`seq:advance` pasa a la tabla de eventos S→C: destinatario, **solo el autor**
de un evento de trazo; payload `{ seq }`. **No consume un `seq` propio**: lleva
el `seq` del evento de trazo que el autor no recibe. En `join`, el servidor
asigna un `seq` a `presence:joined` y construye el snapshot **después**, de
modo que `snapshot.seq` incluye ese evento y el recién llegado no lo recibe.

## Consecuencias

- El contrato queda cerrado en los puntos que bloqueaban la implementación del
  servidor; la sala tiene tres cotas independientes y una cota máxima de snapshot.
- `shared/` gana `MAX_TOTAL_POINTS` y `parseClientEvent`, y pierde `lastSeq` en
  `session:resume`.
- El tope de ~8 MB por snapshot es una cota, no un objetivo: se revisará con
  datos reales en una tarea de rendimiento.

## Reversión y mitigación

- `MAX_TOTAL_POINTS` vive en `shared/src/limits.ts`; recalibrarlo no cambia el protocolo.
- Si `seq:advance` resultara costoso, una alternativa es entregar al autor los
  mismos eventos con un indicador `own: true` (requeriría un nuevo ADR).
