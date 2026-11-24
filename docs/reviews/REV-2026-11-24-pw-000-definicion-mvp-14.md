# REV-2026-11-24-pw-000-definicion-mvp-14

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 895ae4b
- Severidad: Medium
- Categoría: IMPLEMENTATION
- Estado: Corregido en delivery-build (pendiente de verificación en delivery-publish)
- Criterio / plan vigente: AC-9; ADR de ajustes A2 · PLAN-2026-11-24-pw-000-definicion-mvp v2
- Etapa responsable: IMPLEMENTATION → delivery-build

## Comportamiento esperado
Un evento desconocido devuelve `{ ok: false, code: "PAYLOAD_INVALID" }` y el servidor no necesita validar el nombre antes.

## Comportamiento observado
`parseClientEvent("constructor", {})` lanza `TypeError: schema.safeParse is not a function` (también con `toString` y `__proto__`): el lookup en `CLIENT_EVENT_SCHEMAS` devuelve propiedades heredadas de `Object.prototype`. Un cliente hostil podría forzar la excepción si el servidor pasa nombres de evento sin validar.

## Evidencia
`shared/src/validation.ts:15-16`; reproducido por el revisor con una prueba temporal de Vitest (ya eliminada). Corrección propuesta: `Object.hasOwn` y prueba.
