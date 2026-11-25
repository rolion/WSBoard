# REV-2026-11-25-pw-004-servidor-websocket-eventos-07

- Severidad: Low
- Categoría: IMPLEMENTATION
- Criterio: AC-6
- Plan vigente: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) v1
- Commit revisado: `b339bc4` (revisor independiente, subagente de contexto limpio sin edición)
- Etapa responsable: ENGINEERING (`delivery-build`)
- Estado: Abierto

## Esperado

La Test Specification pide probar el borde exacto de 16 385 bytes.

## Observado

La prueba de "por encima" envía un mensaje muy superior al límite; el borde exacto no se prueba.

## Evidencia

`server/test/protocol.limits.test.ts:27-47`.
