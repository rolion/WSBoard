# REV-2026-11-25-pw-004-servidor-websocket-eventos-04

- Severidad: Low
- Categoría: IMPLEMENTATION
- Criterio: AC-3
- Plan vigente: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) v1
- Commit revisado: `b339bc4` (revisor independiente, subagente de contexto limpio sin edición)
- Etapa responsable: ENGINEERING (`delivery-build`): documentar la precedencia y probarla
- Estado: Corregido en ENGINEERING, pendiente de verificación en la revisión 2

## Esperado

Reenviar `stroke:start` con un id existente es `STROKE_INVALID` (ADR contrato).

## Observado

Si el id repetido es el del trazo abierto del propio autor, responde `STROKE_LIMIT` (se evalúa antes). No duplica ni cambia estado; la precedencia no estaba fijada.

## Evidencia

`server/src/room/room.ts:196-197`.
