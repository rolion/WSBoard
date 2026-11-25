# TASK-pw-002-acceso-alias-unico — Acceso por alias único

- Trello: [PW-002](https://trello.com/c/hlZtHlxy/3-pw-002-acceso-por-alias-%C3%BAnico) (lista "Backlog MVP")
- Rama: `task/TASK-pw-002-acceso-alias-unico`
- PR: [rolion/WSBoard#3](https://github.com/rolion/WSBoard/pull/3)
- Etapa actual: `REVIEW`
- Clasificación: `NEEDS_PLAN`
- Diseño requerido: Sí ([DDR](../design/DDR-pw-002-acceso-alias-unico-entrada.md))
- Plan: [PLAN-2026-11-25-pw-002-acceso-alias-unico](../plans/PLAN-2026-11-25-pw-002-acceso-alias-unico.md) (COMPLETO)
- Specification readiness: `READY`

## Investigación

**Requisitos de la tarjeta** (sin checklists ni comentarios): al abrir la página
se pide un nombre antes de mostrar pizarra y chat; el servidor valida alias no
vacío, longitud razonable y unicidad entre usuarios conectados (normalizado,
sin distinguir mayúsculas). Aceptación: (1) alias libre permite ingresar;
(2) alias repetido o inválido muestra error claro y deja reintentar; (3) el
alias queda reservado de forma atómica al conectar y se libera al desconectar o
expirar la sesión; (4) no se puede emitir dibujo/chat antes de ingresar.
Dependencias declaradas: PW-001 y PW-004.

**Estado de dependencias**

- PW-001 está mergeada (`c57c3ab`, PR #2). Esta rama parte de `origin/main`.
- PW-004 sigue en "Backlog MVP": no existe lógica de sala. Decisión del usuario
  (2026-11-25): **PW-002 implementa el núcleo mínimo de la sala** y PW-004 lo
  completa con dibujo, chat y difusión. Ver "Alcance".

**Estado del código** (`main` = `c57c3ab`)

- Servidor: solo `createAppServer` con `/health`, Socket.IO `websocket`,
  `maxHttpBufferSize = MAX_MESSAGE_BYTES` y validación de `Origin`
  (`server/src/app.ts:13-31`). No registra ningún evento de dominio, no hay
  estado de sala ni `epoch`, y `server/src/index.ts:6-7` solo escucha.
- Cliente: `client/src/App.tsx:1-40` es la página técnica de PW-001 (botones Conectar/
  Desconectar y estado). `createSocket` usa `reconnection: false`
  (`client/src/connection.ts:26`), supuesto A-3 de PW-001 que reconexión y
  `session:resume` llegarían después; **PW-002 lo sustituye** (ver Decisiones).
- Contrato listo en `shared/`: `aliasSchema`, `normalizeAlias`, `aliasKey`
  (`shared/src/schemas.ts:22-47`), `parseClientEvent` con el mapeo de errores A2
  (`shared/src/validation.ts:14`), `JoinAck`/`ResumeAck`/`AckError`/`Snapshot`
  (`shared/src/types.ts:64-73`), `CLIENT_EVENTS`, `SERVER_EVENTS`,
  `ERROR_EVENT` (`shared/src/events.ts:23-54`) y límites `MAX_PARTICIPANTS`,
  `RECONNECT_GRACE_MS`, `PROTOCOL_VERSION`, `ROOM_ID`.
- No existen: estado de sala, participantes, tokens, `epoch`, pantalla de alias,
  Playwright, componentes de UI más allá de `App.tsx`.

**Contratos y decisiones aplicables** (no cambian en este TASK)

- [ADR contrato](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md):
  `session:join`, `session:resume`, `session:leave`, `NOT_JOINED`, eventos
  `presence:*`, errores y casos de reconexión.
- [ADR arquitectura](../adr/ADR-pw-000-definicion-mvp-arquitectura.md): D2 (sala
  `main`, 30 participantes), D3 (servidor autoritativo), D4 (reinicio y `epoch`),
  D5 (token, gracia de 30 s, pestaña = participante), D7 (snapshot y `seq`).
- [ADR de ajustes](../adr/ADR-pw-000-definicion-mvp-ajustes-revision.md): A2 (mapeo
  de errores), A5 (sin `replaced` ni `lastSeq`), A6 (`snapshot.seq` incluye el
  `presence:joined` propio).
- [DDR de PW-000](../design/DDR-pw-000-definicion-mvp-experiencia.md): pantalla de
  entrada y estados de conexión.

**Veredicto**

- `NEEDS_PLAN`: implementa el contrato ya aceptado sin cambiar eventos, `seq`,
  sincronización ni autoridad del estado. No requiere ADR. Sí introduce estado
  de servidor y transiciones de ciclo de vida, por lo que el plan es COMPLETO.
- Diseño: **requerido**. Cambia pantallas y estados visibles (entrada, errores,
  reconectando, sala provisional).

**Decisiones del usuario (2026-11-25)**

1. Alcance de servidor: núcleo de sala mínimo (ver Specification).
2. Incluir gracia de reconexión de 30 s y `session:resume` (ciclo completo del ADR).
3. Añadir Playwright (dependencia nueva aprobada) con dos contextos independientes.
   La descarga de los navegadores de Playwright se confirma por separado en
   `delivery-build`.

**Supuestos** (no cambian el ADR; el usuario puede objetarlos al revisar el PR)

| ID | Supuesto |
|---|---|
| A-1 | Los errores de eventos con ack (`session:join`, `session:resume`, `chat:send`) se devuelven **solo por el ack** (`{ ok: false, error }`); los de eventos sin ack, por el evento `error`. Así el emisor recibe una única señal. |
| A-2 | Antes de unirse, un evento C→S **conocido** distinto de `session:join`/`session:resume` recibe `NOT_JOINED`; un evento **desconocido** recibe `PAYLOAD_INVALID` (A2). |
| A-3 | Tras unirse, `stroke:*` y `chat:send` aún no tienen manejador (PW-004): se ignoran sin cambiar estado. No hay respuesta hasta PW-004. |
| A-4 | `session:resume` desde un socket que ya está unido responde `ALREADY_JOINED` (el ADR no lo define). |
| A-5 | No hay límite de tasa para `session:join` en este TASK (el ADR no lo define). Riesgo conocido: en una sala pública sin cuentas, quien llene los 30 cupos puede ocupar aliases. Se registra como deuda; mitigarlo requiere decisión de producto. |
| A-6 | La sala provisional muestra alias y estado de conexión y un botón "Salir" (`session:leave`). Pizarra, chat y lista de participantes son PW-003/005/009/010. |
| A-7 | El cliente ignora los eventos de difusión (`presence:*`, etc.) y no valida `seq` hasta PW-008/PW-010; en `resume` solo usa `selfId`. |
| A-8 | La gracia de reconexión es solo la constante compartida; las pruebas la acortan con una opción de `createAppServer`, no con una variable de entorno (los límites viven solo en `shared/src/limits.ts`). |

## Specification

**Alcance**

- *Servidor (núcleo de sala mínimo)*: estado en memoria de la sala `main`
  (`epoch`, contador `seq`, participantes, tokens, reserva de alias),
  `session:join`, `session:resume`, `session:leave`, tratamiento de la
  desconexión del socket (estado `reconnecting` y gracia de `RECONNECT_GRACE_MS`),
  difusión de `presence:joined`, `presence:status` y `presence:left` con `seq`, y
  bloqueo `NOT_JOINED` de cualquier otro evento antes de unirse. El snapshot
  devuelve `strokes: []` y `chat: []` (PW-004 los rellena).
- *Cliente*: pantalla de entrada con los estados del DDR, ingreso por
  `session:join`, token en `sessionStorage`, reanudación automática al recargar y
  tras caídas, vuelta a la entrada con aviso en `SESSION_EXPIRED`, y sala
  provisional.

**Fuera de alcance**: trazos, chat, rate limiting de chat/trazos, snapshot con
contenido, validación de `seq` en el cliente, lista de participantes, layout
2/3–1/3, Canvas, contador visible de la gracia, despliegue, CI.

**Criterios de aceptación**

- **AC-1 Ingreso.** Con un alias válido y libre, `session:join` responde
  `{ ok: true, sessionToken, snapshot }`; el snapshot contiene `protocol`,
  `epoch`, `seq`, `selfId` y al participante propio con estado `connected`. El
  alias queda reservado con la clave `aliasKey`.
- **AC-2 Rechazo reintentable.** Un alias inválido (`ALIAS_INVALID`), repetido
  sin distinguir mayúsculas ni formas Unicode compatibles (`ALIAS_TAKEN`, también
  frente a participantes en gracia), protocolo distinto (`PROTOCOL_MISMATCH`),
  sala con 30 participantes (`ROOM_FULL`) o un segundo `join` del mismo socket
  (`ALREADY_JOINED`) responde con ack de error, **no** reserva nada ni cambia el
  estado, y el socket puede reintentar `session:join` con otro alias.
- **AC-3 Reserva atómica.** Si varios sockets envían a la vez el mismo alias
  (incluidas variantes de mayúsculas), exactamente uno obtiene `ok` y el resto
  `ALIAS_TAKEN`. La comprobación y la reserva ocurren en el mismo turno síncrono.
- **AC-4 Liberación.** El alias vuelve a estar libre: (a) al instante con
  `session:leave`; (b) al vencer `RECONNECT_GRACE_MS` tras caer el socket, con
  `presence:left { reason: "timeout" }`; (c) tras un reinicio del servidor. Mientras
  dura la gracia el alias sigue reservado.
- **AC-5 Sin acciones antes de ingresar.** Antes de unirse, todo evento C→S distinto
  de `session:join`/`session:resume` devuelve `NOT_JOINED` (o `PAYLOAD_INVALID` si es
  desconocido, A-2), sin cambiar estado. El cliente no renderiza pizarra ni chat
  hasta recibir `ok`.
- **AC-6 Reanudación.** `session:resume { sessionToken }` con un token de un
  participante vivo o en gracia del mismo `epoch` responde `{ ok: true, snapshot }`
  completo; si estaba en `reconnecting` pasa a `connected` y se difunde
  `presence:status`; si el token estaba activo en otro socket, ese socket se
  desconecta (sin cambio de presencia). Token desconocido, vencido o de otro
  `epoch` responde `SESSION_EXPIRED`.
- **AC-7 Presencia con `seq`.** `presence:joined` (a todos menos al nuevo),
  `presence:status` y `presence:left` (a todos) llevan `seq` global monótono sin
  huecos, y `snapshot.seq` ya incluye el `presence:joined` propio (A6).
- **AC-8 Pantalla de entrada.** Cumple el [DDR](../design/DDR-pw-002-acceso-alias-unico-entrada.md):
  campo de alias, "Entrar", estados inactivo/conectando/uniendo/error/sesión
  expirada, mensaje claro por cada código de error, foco y `aria-live`, y reintento
  sin recargar la página.
- **AC-9 Sesión en el cliente.** El token vive en `sessionStorage`; al recargar la
  pestaña con token vigente se reanuda sin pedir alias; ante una caída el cliente
  muestra "Reconectando…", reintenta y, si el servidor responde `SESSION_EXPIRED`,
  vuelve a la entrada con aviso y borra el token. Dos pestañas son dos
  participantes distintos.

**Casos límite**

- Alias con mayúsculas/minúsculas mezcladas, ancho completo (NFKC) o espacios
  alrededor: misma clave de unicidad.
- Alias ocupado por un participante `reconnecting`: sigue ocupado hasta expirar.
- Salida o caída antes de unirse: no hay participante ni estado.
- Un socket reemplazado por `resume` que se desconecta después no debe marcar al
  participante como `reconnecting` ni liberar su alias.
- Caída del socket justo al vencer la gracia: se resuelve en un solo turno, sin
  doble `presence:left`.
- Sala llena de 30 incluyendo `reconnecting`; el 31.º recibe `ROOM_FULL` y, al
  liberarse un cupo, puede entrar.
- `sessionStorage` bloqueado o inexistente: la app funciona sin reanudación.
- Servidor inalcanzable al abrir o al pulsar "Entrar" (error y reintento);
  ack que no llega (el cliente muestra error y permite reintentar).
- Doble clic en "Entrar" (un solo `join` en vuelo).
- Mensaje de más de `MAX_MESSAGE_BYTES`: cierra el socket; el cliente lo trata como
  una caída (reanuda si estaba unido).
- El token no se registra en logs ni se difunde.

## Test Specification

| Criterio | Verificación | Tipo |
|---|---|---|
| AC-1 | `server/test/room.test.ts` (join feliz, snapshot); `server/test/session.test.ts` (cliente `socket.io-client`: ack `ok`, forma del snapshot, participante propio) | Unitaria + integración |
| AC-2 | `room.test.ts` (inválido, tomado por mayúsculas/NFKC/gracia, llena de 30, protocolo, ya unido; el estado no cambia); `session.test.ts` (error por ack y reintento con otro alias en el mismo socket) | Unitaria + integración |
| AC-3 | `session.test.ts`: N sockets simultáneos con variantes del mismo alias → un `ok` y N−1 `ALIAS_TAKEN`; `room.test.ts`: dos `join` consecutivos síncronos | Integración + unitaria |
| AC-4 | `room.test.ts` con temporizadores falsos (leave, gracia, vencimiento, no doble `presence:left`); `session.test.ts` con `reconnectGraceMs` corto y espera por el evento `presence:left` (sin esperas fijas); reinicio del servidor = nuevo `epoch` | Unitaria + integración |
| AC-5 | `session.test.ts`: cada evento C→S conocido antes de unirse → `NOT_JOINED` (por `error` o por ack, A-1), desconocido → `PAYLOAD_INVALID`, estado intacto. E2E: antes de entrar no existen los elementos `board` ni `chat` | Integración + E2E |
| AC-6 | `room.test.ts` y `session.test.ts`: resume en gracia conserva alias y emite `presence:status`; token ajeno/vencido/otro `epoch` → `SESSION_EXPIRED`; resume con el token activo en otro socket lo desconecta sin alterar presencia; `ALREADY_JOINED` (A-4) | Unitaria + integración |
| AC-7 | `session.test.ts` con dos clientes: `seq` contiguo, `snapshot.seq` incluye el join propio, `presence:joined` no llega al nuevo | Integración |
| AC-8 | `client/test/alias-messages.test.ts` (código → mensaje); E2E: alias libre, error de duplicado, error de alias inválido, reintento sin recargar, foco y rol `alert`/`status` | Unitaria + E2E |
| AC-9 | `client/test/session.test.ts` (controlador con socket falso: estados, resume, `SESSION_EXPIRED`, `sessionStorage` bloqueado, doble `join`); E2E: recarga conserva alias, token manipulado → entrada con aviso, dos contextos independientes | Unitaria + E2E |

**Playwright: corresponde** (flujo crítico de colaboración): dos contextos de
navegador independientes y aserciones sobre estado observable, sin esperas fijas.
Escenarios: (E2E-1) alias libre ingresa y ve la sala provisional; (E2E-2) segundo
contexto con el mismo alias en otras mayúsculas ve el error, reintenta con otro y entra;
(E2E-3) el primer contexto pulsa "Salir" y el alias queda libre para otro contexto;
(E2E-4) recarga de la pestaña conserva alias; (E2E-5) token manipulado → aviso de
sesión expirada; (E2E-6) antes de entrar no hay pizarra ni chat. La expiración por
gracia y la carrera simultánea se cubren en integración (el tiempo y la simultaneidad
no son observables de forma fiable desde el navegador).

## Implementation Plan

Ver [PLAN-2026-11-25-pw-002-acceso-alias-unico](../plans/PLAN-2026-11-25-pw-002-acceso-alias-unico.md) (COMPLETO, v1).

## Decisiones

No hay ADR nuevo: el comportamiento está en el ADR de contrato y en D2–D5/D7 de
arquitectura. Decisiones técnicas rutinarias:

- **Reserva atómica por construcción.** Node procesa un evento a la vez: la clase
  `Room` hace `aliasKey` → comprobar → insertar en el mismo método síncrono, sin
  `await` entre medias. No hacen falta cerrojos.
- **`Room` separada del transporte.** `server/src/room.ts` no importa Socket.IO:
  recibe un reloj/temporizador inyectable y devuelve los eventos a difundir; el
  cableado con sockets (`server/src/session.ts`) es fino. Permite probar la gracia
  con temporizadores falsos.
- **`epoch` y token.** `epoch` = UUID generado al crear la `Room`; token =
  `crypto.randomBytes(16)` en hexadecimal (128 bits). Los tokens se guardan solo en
  memoria y nunca en logs.
- **Cada socket unido pertenece a la sala Socket.IO `main`** solo tras un `join`/`resume`
  correctos; así las difusiones solo llegan a unidos.
- **Cliente.** Se reemplaza la página técnica: `connection.ts` pasa a reconexión
  automática de Socket.IO (backoff acotado) y un controlador de sesión
  (`client/src/session.ts`) por encima, aislado de React como en PW-001. Esto
  supersede el supuesto A-3 de PW-001 (`reconnection: false`), que ya anticipaba que la
  reconexión llegaría con las tareas de sesión.
- **Mensajes de usuario en el cliente** (`client/src/alias-messages.ts`); el `message`
  del servidor es solo diagnóstico (ADR contrato).
- **DDR:** [DDR-pw-002-acceso-alias-unico-entrada](../design/DDR-pw-002-acceso-alias-unico-entrada.md)
  concreta la pantalla 1 del DDR de PW-000 sin reemplazarlo.

## Implementación

**Cambios**

- `server/src/room.ts` (nuevo): clase `Room` (estado en memoria, reserva atómica del alias,
  tokens, `epoch`, `seq`, gracia con reloj inyectable). No importa Socket.IO.
- `server/src/session.ts` (nuevo): cableado Socket.IO con `onAny`: `parseClientEvent`,
  errores por ack o por evento `error` (A-1), puerta `NOT_JOINED` (A-2), sala `main`,
  `session:leave`, desconexión; sin tokens en logs.
- `server/src/app.ts`: `createAppServer(config, roomOptions)` crea la `Room`, la conecta y la
  libera en `close()`. Expone `room` para pruebas.
- `client/src/session.ts` (nuevo): controlador de sesión aislado de React (`attach`/`detach`
  reiniciables), `client/src/alias-messages.ts`, `EntryScreen.tsx`, `RoomPlaceholder.tsx`,
  `styles.css`; `App.tsx` elige pantalla por estado.
- `client/src/connection.ts`: queda `SocketLike` + `createSocket` con reconexión automática
  (backoff 500 ms–3 s). Se **elimina** `ConnectionController` y su prueba: la página técnica de
  PW-001 ya no existe y el controlador de sesión lo sustituye (supersede el supuesto A-3 de PW-001).
- `e2e/alias.spec.ts`, `playwright.config.ts` (puertos propios 3101/5273, `PW_CHANNEL`),
  `e2e/tsconfig.json`; scripts `test:e2e` y `typecheck` (incluye E2E); `README.md`, `CLAUDE.md`,
  `.gitignore`.
- Dependencia nueva (aprobada): `@playwright/test` 1.65 (devDependency raíz).

**Criterios cubiertos**

| Criterio | Verificación |
|---|---|
| AC-1 | `room.test.ts`, `session.test.ts` (ingreso), E2E-1 |
| AC-2 | `room.test.ts`, `session.test.ts` (inválido, repetido por mayúsculas/NFKC, protocolo, llena, ya unido, reintento en el mismo socket), E2E-2 |
| AC-3 | `session.test.ts` (10 sockets simultáneos, variantes del alias: 1 `ok`, 9 `ALIAS_TAKEN`), `room.test.ts` |
| AC-4 | `room.test.ts` (temporizadores falsos), `session.test.ts` (gracia 150 ms con espera por evento), E2E-3 |
| AC-5 | `session.test.ts` (`NOT_JOINED` por evento y por ack, `PAYLOAD_INVALID`, estado intacto), E2E-6 |
| AC-6 | `room.test.ts`, `session.test.ts` (resume en gracia, vencido, otro `epoch`, socket reemplazado, `ALREADY_JOINED`), E2E-4, E2E-5 |
| AC-7 | `session.test.ts` (dos clientes, `seq` contiguo, `snapshot.seq`), `room.test.ts` |
| AC-8 | `alias-messages.test.ts`, E2E-1/2/3 (foco, `aria-invalid`, `role="alert"`) |
| AC-9 | `client/test/session.test.ts`, E2E-4, E2E-5 |

**Pruebas ejecutadas** (commit de trabajo previo al de registro): `npm run lint` PASS;
`npm run typecheck` PASS (incluye `e2e/`); `npm test` → shared 75, server 57, client 27, PASS;
`npm run build` PASS; `PW_CHANNEL=chrome npm run test:e2e` → 6 pruebas PASS (dos contextos
independientes); `npm audit` 0 vulnerabilidades.

**Desviaciones**

- *Hallazgo propio:* una prueba reveló que un ack tardío de un `join` cuyo envío ya se canceló
  (socket caído) llevaba a la sala. El controlador ahora lo ignora si ya no hay envío en curso.
- `ALREADY_JOINED` se evalúa **antes** que `ALIAS_TAKEN` (un socket unido que repite su alias no
  debe ver "alias en uso"); el ADR lo lista al final. Sin cambio observable para los demás casos.
- `ConnectionController` y `client/test/connection.test.ts` eliminados (ver Cambios).
- Los E2E usan puertos 3101/5273 y `reuseExistingServer: false`: los puertos 3001/5173 estaban
  ocupados por `npm run dev` de otro worktree y reutilizarlos habría probado código ajeno.
- Los E2E se ejecutaron con el Chrome instalado (`PW_CHANNEL=chrome`); **no** se descargó el
  Chromium de Playwright (la descarga requiere confirmación del usuario).
- No se hizo comprobación visual en el navegador integrado; el render se verificó con E2E
  (roles, textos, foco).

**Deuda técnica**

- Si el ack de `join` se pierde con la conexión, el servidor ya reservó el alias y el cliente no
  conoce el token: el usuario ve `ALIAS_TAKEN` con su propio alias hasta que vence la gracia (30 s).
- Un `resume` sin ack reintenta cada `ackTimeoutMs` indefinidamente; no hay tope de reintentos.
- Sin límite de tasa para `session:join` (A-5): un cliente puede ocupar los 30 cupos.
- Una prueba usa una espera de 120 ms (aserción negativa sin evento observable: el alias
  del socket reemplazado sigue vivo tras la gracia).
- Sin pruebas de render de componentes (jsdom/Testing Library); lo cubren los E2E.
- `stroke:*` y `chat:send` se ignoran tras unirse hasta PW-004 (A-3).
- El contador de la gracia no se muestra (DDR; PW-010).

## Testing

_Pendiente._

## Review

_Pendiente._

## Publicación

_Pendiente._

## Historial

| Fecha | Transición | Nota |
|---|---|---|
| 2026-11-25 | INVESTIGATION → DESIGN → PLANNING | Tarjeta leída; usuario decide alcance (núcleo de sala mínimo), gracia + resume y Playwright; Specification `READY` |
| 2026-11-25 | PLANNING → ENGINEERING | PR abierto; se invoca `delivery-build` |
| 2026-11-25 | ENGINEERING → REVIEW | Implementado; lint, typecheck, build, 159 pruebas unitarias/integración y 6 E2E en PASS |
