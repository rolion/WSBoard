# PLAN-2026-11-25-pw-002-acceso-alias-unico

- Modo: **COMPLETO** (introduce estado de sala y transiciones de ciclo de vida; toca la frontera servidor/cliente del contrato)
- Versión: 1
- TASK: [TASK-pw-002-acceso-alias-unico](../tasks/TASK-pw-002-acceso-alias-unico.md)
- Decisiones aplicables: [ADR contrato](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md), [ADR arquitectura](../adr/ADR-pw-000-definicion-mvp-arquitectura.md) (D2–D5, D7), [ADR ajustes](../adr/ADR-pw-000-definicion-mvp-ajustes-revision.md) (A2, A5, A6), [DDR PW-002](../design/DDR-pw-002-acceso-alias-unico-entrada.md)

## Objetivo

Que nadie vea pizarra ni chat ni pueda emitir eventos sin haber entrado con un alias
único reservado de forma atómica en el servidor, y que ese alias se libere al salir o
expirar la sesión.

## Alcance

Núcleo de sala del servidor (join/resume/leave, gracia, presencia con `seq`, `NOT_JOINED`),
pantalla de entrada y sesión del cliente, sala provisional, pruebas unitarias, de
integración y Playwright. Sin trazos, chat, snapshot con contenido ni lista de
participantes.

## Invariantes

1. Un alias (por `aliasKey`) pertenece como máximo a un participante.
2. `participants.size ≤ MAX_PARTICIPANTS`; los `reconnecting` cuentan.
3. Cada token apunta a exactamente un participante vivo o en gracia; borrar al participante borra su token y su clave de alias.
4. Cada participante está en uno de: `connected` (con un `socketId`) o `reconnecting` (con un temporizador de gracia). Nunca ambos.
5. `seq` crece de uno en uno por cada evento difundido; no se consume en errores ni en acks.
6. `join`/`resume` rechazados no mutan el estado.
7. Un socket sin participante asociado no recibe difusiones y solo puede enviar `session:join`/`session:resume`.

## Transiciones

| Desde | Evento | Hasta | Efecto |
|---|---|---|---|
| (socket sin unir) | `join` válido y libre | `connected` | reserva alias, crea token, `seq++`, `presence:joined` a los demás, ack con snapshot |
| (socket sin unir) | `join` rechazado | (igual) | ack de error |
| `connected` | cae el socket | `reconnecting` | arranca gracia, `seq++`, `presence:status` a todos |
| `reconnecting` | `resume` válido | `connected` | cancela gracia, enlaza socket, `seq++`, `presence:status`, ack con snapshot |
| `connected` | `resume` válido desde otro socket | `connected` | desconecta el socket anterior, enlaza el nuevo, ack con snapshot; sin evento de presencia |
| `reconnecting` | vence la gracia | (eliminado) | libera alias y token, `seq++`, `presence:left { timeout }` |
| `connected` | `leave` | (eliminado) | libera alias y token, `seq++`, `presence:left { leave }`, cierra el socket |
| (cualquiera) | reinicio del proceso | (todo vacío) | nuevo `epoch`; los tokens previos dan `SESSION_EXPIRED` |

## Pasos

| # | Paso | Archivos |
|---|---|---|
| 1 | Dependencia `@playwright/test` (aprobada) y script `test:e2e`; configuración de Playwright con `webServer` para servidor y cliente. **La descarga de navegadores se pide al usuario antes de ejecutarla.** | `package.json`, `playwright.config.ts`, `e2e/` |
| 2 | `Room`: estado, `join`, `resume`, `leave`, `disconnect`, gracia con reloj inyectable, generación de `seq`, snapshot, eventos de salida. Sin Socket.IO | `server/src/room.ts` |
| 3 | Pruebas de `Room` con temporizadores falsos (invariantes y transiciones) | `server/test/room.test.ts` |
| 4 | Cableado Socket.IO: `parseClientEvent`, A-1 (ack o `error`), A-2 y A-3 (puerta `NOT_JOINED` con `onAny`), sala `main`, difusión de presencia, socket reemplazado; opción `reconnectGraceMs`; sin tokens en logs | `server/src/session.ts`, `server/src/app.ts` |
| 5 | Pruebas de integración con `socket.io-client`: AC-1 a AC-7, carrera, gracia corta, reinicio (nuevo `epoch`) | `server/test/session.test.ts` |
| 6 | Cliente: `connection.ts` con reconexión automática; `session.ts` (controlador: estados, join, resume, expirada, leave, `sessionStorage` tolerante a fallos, un join en vuelo, tiempo de espera de ack); `alias-messages.ts` | `client/src/connection.ts`, `client/src/session.ts`, `client/src/alias-messages.ts` |
| 7 | Pruebas del controlador y de los mensajes con socket falso | `client/test/session.test.ts`, `client/test/alias-messages.test.ts`, ajuste de `client/test/connection.test.ts` |
| 8 | UI: `App.tsx` por estado, `EntryScreen`, `RoomPlaceholder` según el DDR (`data-testid` estables, roles ARIA) | `client/src/App.tsx`, `client/src/EntryScreen.tsx`, `client/src/RoomPlaceholder.tsx`, estilos mínimos |
| 9 | E2E con dos contextos: E2E-1 a E2E-6 | `e2e/alias.spec.ts` |
| 10 | README (variables, `test:e2e`), `CLAUDE.md` (comandos), verificación completa y comprobación manual en el navegador integrado | `README.md`, `CLAUDE.md` |

**Dependencias entre pasos:** 3 tras 2; 4 tras 2; 5 tras 4; 7 tras 6; 8 tras 6; 9 tras 4, 8 y 1; 10 al final. Los bloques servidor (2–5) y cliente (6–8) son independientes entre sí y solo se encuentran en el paso 9.

## Verificación por criterio

| Criterio | Verificación |
|---|---|
| AC-1 | `room.test.ts`, `session.test.ts`, E2E-1 |
| AC-2 | `room.test.ts`, `session.test.ts`, E2E-2 |
| AC-3 | `session.test.ts` (carrera de N sockets), `room.test.ts` |
| AC-4 | `room.test.ts` (temporizadores falsos), `session.test.ts` (gracia corta, `presence:left`), E2E-3 |
| AC-5 | `session.test.ts`, E2E-6 |
| AC-6 | `room.test.ts`, `session.test.ts`, E2E-4, E2E-5 |
| AC-7 | `session.test.ts` (dos clientes, `seq` contiguo) |
| AC-8 | `alias-messages.test.ts`, E2E-1, E2E-2, E2E-3 |
| AC-9 | `client/test/session.test.ts`, E2E-4, E2E-5 |

Comando final: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`.
Comprobación manual en el navegador integrado: `npm run dev`, ingreso, error por duplicado,
recarga, caída del servidor y vuelta.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Carrera entre la caída de un socket reemplazado y el nuevo | `Room` asocia el `socketId` actual a cada participante y solo reacciona a la desconexión del socket vigente (caso límite de la Specification) |
| Temporizadores de gracia huérfanos que mantienen vivo el proceso en pruebas | Los temporizadores se crean con el reloj inyectable; `Room.dispose()` los cancela y `close()` del servidor lo invoca |
| E2E inestables por tiempos | Solo aserciones sobre estado observable (`expect.poll`, roles, `data-testid`); nada de esperas fijas. La carrera simultánea y la gracia se prueban en integración |
| Playwright exige descargar navegadores y un `webServer` con puertos fijos | Pedir confirmación antes de la descarga; `webServer` con `reuseExistingServer` fuera de CI y `ALLOWED_ORIGINS` explícito |
| Pasar a reconexión automática cambia el comportamiento de PW-001 (`reconnection: false`) | Actualizar `client/test/connection.test.ts`; el controlador de sesión es la única capa que reacciona a `connect` tras una caída |
| Ocupación maliciosa de aliases sin límite de tasa en `join` (A-5) | Fuera de alcance; deuda registrada en el TASK y propuesta como tarea futura |
| Si resultara necesario un evento o campo nuevo, o cambiar `seq`/sincronización | Se detiene `delivery-build` y se vuelve a `delivery-start` con un ADR que reemplace al vigente |

## Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1 | 2026-11-25 | Plan inicial |
