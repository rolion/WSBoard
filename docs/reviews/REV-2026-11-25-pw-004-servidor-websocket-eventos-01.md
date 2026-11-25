# REV-2026-11-25-pw-004-servidor-websocket-eventos-01

- Severidad: Medium
- Categoría: IMPLEMENTATION
- Criterio: AC-5
- Plan vigente: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) v1
- Commit revisado: `b339bc4` (revisor independiente, subagente de contexto limpio sin edición)
- Etapa responsable: ENGINEERING (`delivery-build`)
- Estado: Resuelto (verificado en la revisión 2, commit `b59cec4`)

## Esperado

La Test Specification pide ausencia de huecos en cada cliente mientras un tercero entra y todos dibujan.

## Observado

Para A y B solo se comprueba orden (`expect(seqs).toEqual(sorted)`), que admite huecos y duplicados; además A envía 20 `chat:send` y solo 5 pasan la tasa.

## Evidencia

`server/test/protocol.sync.test.ts:38,44,46-49`. El código cumple (comprobado a mano por el revisor); falta la aserción.
