# REV-2026-11-25-pw-004-servidor-websocket-eventos-03

- Severidad: Low
- Categoría: IMPLEMENTATION
- Criterio: AC-8
- Plan vigente: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) v1
- Commit revisado: `b339bc4` (revisor independiente, subagente de contexto limpio sin edición)
- Etapa responsable: ENGINEERING (`delivery-build`)
- Estado: Abierto

## Esperado

Se verifica que el `sessionToken` no aparece en difusiones tras `join`, `resume` y `leave`.

## Observado

Solo se comprueba tras `join`.

## Evidencia

`server/test/protocol.session.test.ts:34`, `room.session.test.ts:25`. No hay fuga en el código.
