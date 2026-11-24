# ADR-pw-000-definicion-mvp-contrato-eventos — Contrato de eventos WebSocket (v1)

- Estado: Aceptado (2026-11-24)
- Tarea: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Depende de: [ADR de arquitectura](ADR-pw-000-definicion-mvp-arquitectura.md)
- Enmendado por: [ADR de ajustes tras la revisión](ADR-pw-000-definicion-mvp-ajustes-revision.md) (A1–A6); prevalece sobre este texto

## Convenciones

- Transporte: Socket.IO, solo `websocket`. Todos los payloads son JSON.
- `PROTOCOL_VERSION = 1`.
- Dirección: **C→S** (cliente al servidor) o **S→C** (servidor a clientes).
- Toda validación se hace en el servidor con los esquemas zod de `shared/`.
  Un mensaje inválido se **rechaza sin cambiar estado** y el emisor recibe
  `error` (ver abajo). Campos desconocidos se descartan (`strip`). El
  servidor nunca confía en `participantId`, `seq` ni `ts` enviados por el
  cliente: los fija él.
- Mapeo de fallos de esquema a códigos de error: ver ADR de ajustes (A2) y
  `parseClientEvent` en `shared/`.
- Los eventos de difusión (`S→C`) llevan `seq` (entero, monotónico, sin
  huecos, global a la sala).
- Los eventos C→S con respuesta usan *acknowledgement* de Socket.IO.
  Respuesta: `{ ok: true, ... }` o `{ ok: false, error: { code, message } }`.
- Cualquier evento C→S distinto de `session:join` / `session:resume` enviado
  antes de unirse recibe `error NOT_JOINED`.

## Tipos comunes

```ts
type Alias = string;            // ver validación
type ParticipantId = string;    // id corto opaco asignado por el servidor
type StrokeId = string;         // uuid v4 generado por el cliente; único por sala
type Point = [x: number, y: number];   // [0,1] normalizado, 4 decimales
type Tool = "pen" | "eraser";

interface Participant { id: ParticipantId; alias: Alias; status: "connected" | "reconnecting"; }
interface Stroke {
  id: StrokeId; authorId: ParticipantId; tool: Tool;
  color: string;      // /^#[0-9a-f]{6}$/i
  width: number;      // fracción del ancho lógico, 0.001–0.05
  points: Point[];
  open: boolean;      // true mientras el autor no envíe stroke:end
}
interface ChatMessage { id: string; authorId: ParticipantId; alias: Alias; text: string; ts: number; }
interface Snapshot {
  protocol: 1; epoch: string; seq: number; selfId: ParticipantId;
  participants: Participant[]; strokes: Stroke[]; chat: ChatMessage[];
}
```

## Límites normativos (`shared/limits.ts`)

| Constante | Valor |
|---|---|
| `MAX_PARTICIPANTS` | 30 |
| `ALIAS_MIN` / `ALIAS_MAX` | 2 / 20 caracteres (tras normalizar y recortar) |
| Alias permitido | letras Unicode (con sus marcas combinantes), dígitos, espacio, `_`, `-`, `.`; al menos una letra o dígito; sin espacios dobles ni al inicio/fin |
| `MAX_MESSAGE_BYTES` (`maxHttpBufferSize`) | 16 384 |
| `MAX_POINTS_PER_BATCH` | 64 |
| `MAX_POINTS_PER_STROKE` | 5 000 |
| `MAX_STROKES` | 5 000 |
| `MAX_TOTAL_POINTS` | 500 000 (suma de puntos de todos los trazos de la sala) |
| `STROKE_WIDTH_MIN` / `MAX` | 0.001 / 0.05 |
| `MAX_OPEN_STROKES_PER_PARTICIPANT` | 1 |
| `CHAT_MAX_CHARS` | 500 (tras recortar; no vacío) |
| `CHAT_MAX_NEWLINES` | 5 (sin otros caracteres de control, incluidos U+0085, U+2028 y U+2029) |
| `LOGICAL_ASPECT` / `COORD_DECIMALS` | 16/9 / 4 |
| `CHAT_HISTORY` | 200 mensajes (se descarta el más antiguo) |
| `RATE_STROKE_EVENTS` | 60 eventos `stroke:*` por segundo y socket |
| `RATE_CHAT` | 5 mensajes por 10 s y participante |
| `RECONNECT_GRACE_MS` | 30 000 |

Superar el límite de tasa descarta el evento y emite `error RATE_LIMITED`
(el socket no se desconecta). Un mensaje de más de `MAX_MESSAGE_BYTES` cierra
la conexión (comportamiento de `maxHttpBufferSize`); el cliente reintenta con
`session:resume`.

## Eventos C→S

### `session:join` (ack)
- Emisor: cliente nuevo. Destinatario: servidor.
- Payload: `{ alias: string, protocol: 1 }`
- Validación: protocolo igual; alias normalizado NFKC, recortado, longitud y
  caracteres según tabla; **único** sin distinguir mayúsculas entre
  participantes activos o en gracia; sala no llena; el socket no se ha unido ya.
- Éxito: ack `{ ok: true, sessionToken, snapshot }`. Difunde `presence:joined`
  a los demás.
- Errores: `PROTOCOL_MISMATCH`, `ALIAS_INVALID`, `ALIAS_TAKEN`, `ROOM_FULL`,
  `ALREADY_JOINED`.

### `session:resume` (ack)
- Emisor: cliente tras reconexión o hueco de `seq`.
- Payload: `{ sessionToken: string }`
- Validación: token existente, de un participante vivo o en gracia, con el
  mismo `epoch` de proceso (un reinicio invalida todos los tokens).
- Éxito: ack `{ ok: true, snapshot }` (siempre completo). Si estaba en
  `reconnecting` pasa a `connected` y se difunde `presence:status`. Si el
  token estaba activo en otro socket, ese socket se desconecta.
- Errores: `SESSION_EXPIRED` (cliente vuelve a la pantalla de alias).

### `session:leave`
- Sin payload. Elimina al participante, libera el alias, difunde
  `presence:left` y cierra el socket. Sin ack.

### `stroke:start`
- Payload: `{ id: StrokeId, tool: Tool, color: string, width: number, points: Point[] }`
  (1 a 64 puntos).
- Validación: id uuid y no usado en la sala; tool, color y width válidos;
  puntos en `[0,1]` y finitos; el autor no tiene otro trazo abierto; sala
  con menos de `MAX_STROKES` y sin superar `MAX_TOTAL_POINTS` (si no,
  `BOARD_FULL` y no se crea el trazo).
- Efecto: crea el trazo `open`; difunde `stroke:started` a **todos** los
  demás participantes (el autor ya lo pinta localmente y recibe
  `seq:advance`, ver nota más abajo).
- Errores: `STROKE_INVALID`, `STROKE_LIMIT` (trazo abierto previo),
  `BOARD_FULL`, `RATE_LIMITED`.

### `stroke:points`
- Payload: `{ id: StrokeId, points: Point[] }` (1 a 64 puntos).
- Validación: el trazo existe, está abierto y es del emisor; el total no supera
  5 000 puntos (si no, `STROKE_INVALID`) ni la sala supera `MAX_TOTAL_POINTS`
  (si no, `BOARD_FULL`). Se rechaza todo el lote y el trazo se cierra con
  `stroke:ended` (ver ajustes A4).
- Efecto: añade puntos y difunde `stroke:appended`.

### `stroke:end`
- Payload: `{ id: StrokeId }`
- Validación: trazo abierto del emisor.
- Efecto: marca `open = false`, difunde `stroke:ended`. Todo cierre forzado
  (exceso de puntos, caducidad de la gracia, salida o `timeout` del autor)
  difunde también `stroke:ended` con un `seq` nuevo (ajustes A4); mientras
  el autor está en gracia, el trazo permanece abierto.

### `chat:send` (ack)
- Payload: `{ text: string }`
- Validación: recortado, 1–500 caracteres; sin caracteres de control salvo
  salto de línea (máx. 5); límite de tasa. El texto se difunde **como texto
  plano**; el cliente debe renderizarlo escapado.
- Efecto: crea `ChatMessage` (id, ts del servidor) y difunde `chat:message`
  a **todos**, incluido el emisor (fuente única del orden).
- Errores: `CHAT_INVALID`, `RATE_LIMITED`.

## Eventos S→C (difusión)

Todos incluyen `seq`.

| Evento | Destinatarios | Payload (además de `seq`) |
|---|---|---|
| `presence:joined` | todos menos el nuevo | `{ participant }` |
| `presence:status` | todos | `{ participantId, status }` |
| `presence:left` | todos | `{ participantId, reason: "leave" \| "timeout" }` |
| `stroke:started` | todos menos el autor | `{ stroke }` (con `open: true`) |
| `stroke:appended` | todos menos el autor | `{ id, points }` |
| `stroke:ended` | todos menos el autor | `{ id }` |
| `chat:message` | todos | `{ message }` |
| `seq:advance` | solo el autor de un evento de trazo | `{ seq }` (el `seq` del evento que no recibe; no consume un `seq` propio) |

**Nota sobre `seq` y el autor.** Como el autor no recibe sus propios eventos
de trazo, observaría huecos en `seq`. Por eso se envía al autor un evento
liviano `seq:advance { seq }` por cada evento de trazo que difunde, y el
cliente solo lo usa para avanzar `lastSeq` sin huecos. (Alternativa
descartada: `seq` por destinatario, que rompería el orden global.)

## Evento de error S→C

`error { code, message, ref?: string }` solo al emisor. Códigos:
`NOT_JOINED`, `PROTOCOL_MISMATCH`, `ALIAS_INVALID`, `ALIAS_TAKEN`,
`ROOM_FULL`, `ALREADY_JOINED`, `SESSION_EXPIRED`, `STROKE_INVALID`,
`STROKE_LIMIT` (ya hay un trazo abierto), `BOARD_FULL`, `CHAT_INVALID`,
`RATE_LIMITED`, `PAYLOAD_INVALID` (esquema no cumplido en eventos sin código
propio; ver ajustes A2). Los mensajes de usuario se mapean
en el cliente; `message` es solo diagnóstico.

## Garantías de orden y duplicados

- El servidor procesa los eventos de forma serial; el orden de `seq` es el
  orden de aplicación al estado.
- Un trazo se identifica por `StrokeId` único: reenviar `stroke:start` con
  un id existente es `STROKE_INVALID`, nunca duplica el trazo.
- Reintento de `chat:send` tras una pérdida de ack: el cliente **no**
  reenvía automáticamente (podría duplicar); muestra el estado "no enviado" y
  deja reintentar manualmente.
- Los eventos con `seq <= lastSeq` se ignoran en el cliente; un hueco
  dispara `session:resume`.

## Casos de entrada tardía y reconexión

1. **Entrada tardía**: `join` → snapshot con trazos (incluidos abiertos) y
   chat; después recibe eventos con `seq > snapshot.seq`. Si un trazo abierto
   recibe `stroke:appended` tras el snapshot, se aplica sobre la copia del
   snapshot (los puntos del snapshot llegan hasta `seq`).
2. **Eventos antes del snapshot**: se encolan y se filtran por `seq`.
3. **Reconexión < 30 s**: `resume` devuelve snapshot completo; el cliente
   reemplaza su estado remoto (conserva su trazo local en curso solo si
   `stroke:end` aún no se envió; si el trazo ya no existe en el servidor, se descarta).
4. **Reconexión > 30 s o reinicio**: `SESSION_EXPIRED`; alias libre; vuelta
   a la pantalla de alias.

## Seguridad básica

- Sin autenticación: el alias no es una credencial; el `sessionToken` sí
  actúa como secreto de sesión y no se difunde ni se registra en logs.
- Validar `Origin` del handshake contra una lista configurable (`ALLOWED_ORIGINS`).
- El chat se trata como texto plano (sin HTML) para evitar XSS.
