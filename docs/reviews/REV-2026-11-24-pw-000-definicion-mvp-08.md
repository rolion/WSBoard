# REV-2026-11-24-pw-000-definicion-mvp-08

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Corregido en delivery-build (pendiente de verificación en delivery-publish)
- Criterio / plan vigente: ADR contrato, tipos comunes (`StrokeId` uuid v4) · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: IMPLEMENTATION → delivery-build

## Comportamiento esperado
`strokeIdSchema` solo acepta UUID v4.

## Comportamiento observado
`z.uuid()` acepta cualquier versión y el UUID nil.

## Evidencia
Sondeo del revisor; `shared/src/schemas.ts`. Propuesta: `z.uuid({version:"v4"})` y prueba.
