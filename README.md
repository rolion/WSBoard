# WSBoard (Port Webhook)

Pizarra colaborativa en tiempo real con chat y presencia. Una sala pública única,
usuarios identificados por alias y estado solo en memoria.

Estado actual: estructura del proyecto (PW-001). El servidor acepta conexiones
WebSocket y el cliente tiene una página técnica con **Conectar** / **Desconectar**.
La pizarra, el chat y la presencia llegan en tareas posteriores.

## Requisitos

- Node.js **22.9 o superior** (`--env-file-if-exists`) y npm 10 o superior.

## Instalación

```bash
npm install
```

## Ejecución en local

```bash
npm run dev
```

Arranca el servidor (`http://localhost:3001`) y el cliente (`http://localhost:5173`).
Abre el cliente, pulsa **Conectar** (estado "Conectado") y **Desconectar**.
Comprobación del servidor: `http://localhost:3001/health` responde `{"status":"ok"}`.

Por separado: `npm run dev -w @pw/server` y `npm run dev -w @pw/client`.

## Variables de entorno

Todas son opcionales. Copia el ejemplo que necesites a `.env` en el mismo directorio
(`.env` no se versiona):

| Archivo | Variable | Por defecto | Descripción |
|---|---|---|---|
| `server/.env.example` | `PORT` | `3001` | Puerto del servidor (1–65535). Un valor inválido o un puerto ocupado detiene el arranque con un mensaje. |
| `server/.env.example` | `ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes de navegador permitidos, separados por comas. Un `Origin` no listado se rechaza; las peticiones sin `Origin` (herramientas, pruebas) se aceptan. |
| `client/.env.example` | `VITE_SERVER_URL` | `http://localhost:3001` | URL del servidor WebSocket. |

## Scripts (desde la raíz)

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor y cliente en modo desarrollo |
| `npm run build` | Compila el cliente (`client/dist`) tras comprobar tipos |
| `npm run lint` | ESLint en todo el repositorio |
| `npm run typecheck` | `tsc` en cada workspace |
| `npm test` | Vitest en cada workspace |

## Estructura

- `shared/`: contrato (tipos, límites, esquemas zod, coordenadas).
- `server/`: Node.js + Socket.IO (solo `websocket`).
- `client/`: React 18 + TypeScript + Vite.
- `docs/`: ADR, DDR, planes, tareas y revisiones (`docs/adr/` tiene las decisiones vigentes).

## Protocolo WebSocket

Fuente normativa: [ADR de contrato](docs/adr/ADR-pw-000-definicion-mvp-contrato-eventos.md) y
[ajustes A1–A6](docs/adr/ADR-pw-000-definicion-mvp-ajustes-revision.md) (prevalecen). Los tipos,
esquemas y límites viven en `shared/` (`events.ts`, `schemas.ts`, `limits.ts`); el servidor los aplica en
`server/src/` (`room/room.ts` es el estado autoritativo, `transport.ts` enlaza Socket.IO).

| Cliente → servidor | Respuesta | Difusión resultante |
|---|---|---|
| `session:join { alias, protocol }` | ack `{ ok, sessionToken, snapshot }` | `presence:joined` (a los demás) |
| `session:resume { sessionToken }` | ack `{ ok, snapshot }` | `presence:status` si estaba en gracia |
| `session:leave` | cierra el socket | `presence:left` (`leave`) |
| `stroke:start` / `stroke:points` / `stroke:end` | evento `error` si falla | `stroke:started` / `appended` / `ended` a los demás; `seq:advance` al autor |
| `chat:send { text }` | ack `{ ok }` | `chat:message` a todos, incluido el emisor |

Reglas de comportamiento:

- Antes de unirse, todo evento distinto de `session:join`/`session:resume` recibe `NOT_JOINED`.
- Orden de comprobaciones: evento desconocido → `NOT_JOINED` → ack obligatorio → tasa → esquema
  (`parseClientEvent`) → reglas de dominio. Un evento rechazado no cambia el estado ni consume `seq`.
- Los eventos con ack (`session:join`, `session:resume`, `chat:send`) responden el error por el ack
  (`{ ok: false, error: { code, message } }`); los demás emiten el evento `error { code, message }`. Sin ack,
  esos tres eventos se rechazan con `PAYLOAD_INVALID`.
- Todo evento de difusión lleva `seq` global, monotónico y sin huecos; `snapshot.seq` ya incluye el
  `presence:joined` del recién llegado. Un reinicio del servidor genera un nuevo `epoch` e invalida todos los tokens
  (`SESSION_EXPIRED`).
- Una conexión caída pasa a `reconnecting` durante `RECONNECT_GRACE_MS` (30 s); `session:resume` la recupera.
  Vencida la gracia se cierra su trazo abierto y se difunde `presence:left` (`timeout`).
- Un mensaje mayor que `MAX_MESSAGE_BYTES` cierra el socket (el cliente debe usar `session:resume`).
- Correspondencia con los nombres de la tarjeta PW-004: `join`/`join:error` → `session:join` (ack);
  `presence:update` → `presence:joined|status|left`; `drawing:stroke:*` → `stroke:*`; `board:snapshot` → `snapshot`
  en el ack; `chat:message` → `chat:send` + `chat:message`; `disconnect` → evento nativo de Socket.IO.
