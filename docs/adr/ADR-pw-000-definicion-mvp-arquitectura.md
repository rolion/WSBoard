# ADR-pw-000-definicion-mvp-arquitectura — Stack, sala, autoridad del estado y política de reinicio

- Estado: Aceptado (2026-11-24)
- Tarea: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Relacionado: [ADR de contrato de eventos](ADR-pw-000-definicion-mvp-contrato-eventos.md)
- ADR reemplazados: ninguno (primer ADR del repositorio)

## Contexto

Port Webhook es una pizarra web compartida en tiempo real con chat y
presencia. Los usuarios se identifican solo por alias. El repositorio está
vacío (solo `README.md` y las skills de entrega), así que todo está por
decidir. La tarjeta Trello PW-000 propone React + TypeScript, Canvas 2D y
Node.js con Socket.IO o WebSocket, "a validar".

## Decisiones

### D1. Stack

| Capa | Decisión |
|---|---|
| Cliente | React 18 + TypeScript + Vite. Canvas 2D (`<canvas>`) para dibujar. |
| Servidor | Node.js (LTS) + TypeScript + Socket.IO 4, solo transporte `websocket`. |
| Contrato | Paquete `shared/` con tipos TypeScript, constantes de límites y esquemas zod, usado por cliente y servidor. |
| Pruebas | Vitest (unitarias e integración con cliente `socket.io-client`), Playwright (E2E). |
| Estructura | Monorepo npm workspaces: `client/`, `server/`, `shared/`. |

**Alternativas.**

- `ws` + protocolo propio: menos dependencias, pero obliga a escribir
  reconexión con backoff, acknowledgements, salas y heartbeat. El MVP no
  justifica ese coste.
- Socket.IO (elegida): aporta reconexión automática, acks, heartbeat y salas.
  Se desactiva el *long-polling* para tener un único transporte y evitar
  sesiones pegajosas. Se acepta su protocolo propio como dependencia.
- CRDT (Yjs) para el lienzo: resuelve concurrencia offline, pero el MVP no
  tiene edición offline ni persistencia; sería sobreingeniería.

### D2. Sala única pública

- Existe exactamente **una sala**, con id fijo `main`. No hay creación,
  selección ni URL de sala. Cualquiera que abra la aplicación entra en ella.
- Capacidad máxima: **30 participantes** simultáneos. El 31.º recibe el error
  `ROOM_FULL`.
- El id de sala viaja en el contrato como constante, para permitir varias
  salas más adelante sin cambiar los eventos (fuera del MVP).

### D3. Servidor autoritativo

El servidor es la única fuente de verdad de:

1. **Aliases**: registro de participantes activos. Unicidad insensible a
   mayúsculas y normalizada (NFKC). El cliente nunca decide si un alias está
   libre.
2. **Estado de la pizarra**: lista ordenada de trazos confirmados.
3. **Historial de chat** reciente.
4. **Orden global**: contador monotónico `seq` asignado por el servidor a
   cada evento difundido.

Los clientes envían *intenciones*; el servidor las valida, las aplica a su
estado, les asigna `seq` y las difunde. El cliente puede pintar localmente
su propio trazo en curso (eco optimista), pero el estado compartido se
considera el que difunde el servidor.

### D4. Estado solo en memoria y política de reinicio

- Nada se persiste: ni trazos, ni chat, ni participantes, ni sesiones. Sin
  base de datos ni disco.
- Al arrancar el servidor se genera un `epoch` aleatorio (UUID). Va en
  todo snapshot.
- **Reinicio del servidor** = sala vacía y nuevo `epoch`. Los clientes
  conectados pierden el socket y reintentan. Su `resume` falla con
  `SESSION_EXPIRED`; el cliente vuelve a la pantalla de alias con el aviso
  "La sala se reinició. Tu dibujo y el chat anteriores se perdieron.", sin
  recargar la página. El lienzo local se descarta.
- **Sala sin participantes**: no se borra. El estado se conserva mientras el
  proceso viva. (Decisión de producto asumida: el borrado solo ocurre en
  reinicios. Ver supuesto S3 en el TASK.)
- No hay endpoint de "limpiar pizarra" en el MVP.

### D5. Identidad y sesión

- `session:join { alias }` crea un participante y devuelve `sessionToken`
  (128 bits aleatorios, generado por el servidor, nunca el alias).
- El token vive en `sessionStorage` del navegador (una pestaña = una sesión;
  dos pestañas son dos participantes con aliases distintos).
- **Gracia de reconexión: 30 s.** Si el socket se cae, el participante pasa
  a `reconnecting` y conserva su alias durante 30 s. Dentro de ese tiempo
  `session:resume { sessionToken, lastSeq }` lo recupera. Pasado el tiempo,
  se elimina, se libera el alias y se difunde `presence:left`.
- Un `resume` con el participante aún conectado (pestaña duplicada con el
  mismo token) sustituye al socket anterior, que se desconecta.
- Salida voluntaria (`session:leave`) libera el alias al instante.

### D6. Dibujo: eventos estructurados, nunca imágenes

- El cliente nunca envía bitmaps ni `toDataURL`. Se envían **trazos
  estructurados**: inicio (`stroke:start`), lotes de puntos (`stroke:points`)
  y fin (`stroke:end`).
- **Espacio de coordenadas lógico**: x, y normalizados en `[0, 1]` sobre un
  lienzo lógico de relación **16:9**. El cliente escala al tamaño real del
  `<canvas>` con letterbox (sin deformar) y aplica `devicePixelRatio`. El grosor
  se expresa como fracción del ancho lógico para que escale igual.
- Los puntos se agrupan en el cliente (≈ 30 envíos/s como máximo por
  participante) para limitar el tráfico.
- Herramientas MVP: lápiz y borrador (el borrador es un trazo con color de
  fondo, `tool: "eraser"`), color `#rrggbb` y grosor discreto.

### D7. Sincronización al entrar y carrera snapshot/eventos en vivo

- El servidor envía un **snapshot** completo al aceptar `join` o `resume`:
  participantes, trazos confirmados (incluidos los *abiertos* de otros, con sus
  puntos hasta ese instante), chat, `seq` actual y `epoch`.
- Garantía de orden: Node es de un solo hilo. En el mismo turno en que el
  servidor construye el snapshot, suscribe al socket al difusor. Todo evento
  posterior lleva `seq > snapshot.seq`.
- El cliente aplica el snapshot, fija `lastSeq = snapshot.seq` y **descarta
  cualquier evento con `seq <= lastSeq`**. Si por reordenamiento llegaran
  eventos con `seq` mayor antes de aplicar el snapshot, se **encolan** hasta
  aplicarlo y luego se vacía la cola con el mismo filtro.
- Detección de hueco: si llega un evento con `seq > lastSeq + 1`, el cliente
  pide un snapshot nuevo (`session:resume`). Esto cubre pérdidas en
  reconexión.
- Reconexión del MVP: **siempre snapshot completo** (sin reproducción
  incremental). Con límites de 5 000 trazos el snapshot cabe en la
  carga máxima razonable (ver límites en el ADR de contrato).

### D8. Límites (resumen; valores normativos en el ADR de contrato)

Participantes 30; mensaje ≤ 16 KiB; lote ≤ 64 puntos; trazo ≤ 5 000 puntos;
sala ≤ 5 000 trazos (luego `BOARD_FULL`); chat ≤ 500 caracteres, historial
200; límites de tasa por socket.

## Consecuencias

- Sin persistencia no hay recuperación ante caídas; es una decisión de MVP
  explícita y visible al usuario (D4).
- Un solo proceso Node: no escala horizontalmente. Para varias instancias
  habría que añadir un adaptador de Socket.IO y mover el estado; queda fuera
  del MVP y requeriría un nuevo ADR.
- `BOARD_FULL` es un tope duro; aceptado para evitar crecimiento sin cota de
  memoria y snapshots de tamaño ilimitado.
- Cambiar quién controla el estado, su persistencia o la sincronización
  (D3, D4, D7) exige un ADR posterior que enlace y reemplace a este.

## Reversión y mitigación

- El contrato está versionado (`PROTOCOL_VERSION = 1` en el snapshot y en
  `join`). Un cliente con versión distinta recibe `PROTOCOL_MISMATCH`.
- Si Socket.IO resultara inadecuado, el contrato (`shared/`) es independiente
  del transporte: se reemplaza la capa de conexión sin tocar la lógica de
  sala.
- Si 30 s de gracia o 5 000 trazos resultan inadecuados, son constantes en
  `shared/limits.ts`; cambiarlas no altera el protocolo.
