# REV-2026-11-25-pw-004-servidor-websocket-eventos-05

- Severidad: Low
- Categoría: IMPLEMENTATION
- Criterio: S-1
- Plan vigente: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) v1
- Commit revisado: `b339bc4` (revisor independiente, subagente de contexto limpio sin edición)
- Etapa responsable: ENGINEERING (`delivery-build`): los `stroke:*` responden siempre por `error`, ignorando el callback
- Estado: Corregido en ENGINEERING, pendiente de verificación en la revisión 2

## Esperado

Los `stroke:*` siempre emiten `error`.

## Observado

Si el cliente pasa callback a un `stroke:*`, `NOT_JOINED`, `RATE_LIMITED` y los fallos de esquema salen por el ack; los de dominio, por el evento `error`.

## Evidencia

`server/src/transport.ts:72-76,80,91-95`.
