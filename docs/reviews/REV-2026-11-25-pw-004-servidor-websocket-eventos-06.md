# REV-2026-11-25-pw-004-servidor-websocket-eventos-06

- Severidad: Low
- Categoría: ARCHITECTURE
- Criterio: AC-6
- Plan vigente: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) v1
- Commit revisado: `b339bc4` (revisor independiente, subagente de contexto limpio sin edición)
- Etapa responsable: ENGINEERING (`delivery-build`): registrar en el TASK
- Estado: Corregido en ENGINEERING, pendiente de verificación en la revisión 2

## Esperado

Los límites viven solo en `shared/src/limits.ts`.

## Observado

La ventana de 1000 ms de `RATE_STROKE_EVENTS` está fija en `room.ts:109`; `shared` solo dice "por segundo". S-6 impide añadir constantes a `shared/`. Aceptable, falta registrar la decisión.

## Evidencia

`server/src/room/room.ts:109`.
