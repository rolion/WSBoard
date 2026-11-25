# REV-2026-11-25-pw-004-servidor-websocket-eventos-08

- Severidad: Low
- Categoría: IMPLEMENTATION
- Criterio: AC-9
- Plan vigente: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) v1
- Commit revisado: `b339bc4` (revisor independiente, subagente de contexto limpio sin edición)
- Etapa responsable: ENGINEERING (`delivery-build`)
- Estado: Corregido en ENGINEERING, pendiente de verificación en la revisión 2

## Esperado

El README documenta la semántica de errores y el orden de comprobaciones.

## Observado

No recoge la precedencia de `join` (S-9), que `session:leave` antes de unirse da `NOT_JOINED`, ni el cierre de socket por nombres de evento inválidos.

## Evidencia

`README.md` sección Protocolo WebSocket.
