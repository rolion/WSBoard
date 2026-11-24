# REV-2026-11-24-pw-000-definicion-mvp-11

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Corregido parcialmente en delivery-build (nombres y constantes alineados; la confusión `STROKE_LIMIT` vs `STROKE_INVALID` queda como asunto de Specification, ver REV-05)
- Criterio / plan vigente: AC-1 / AC-5; ADR contrato, tabla de límites · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: IMPLEMENTATION → delivery-build (alinear documento o código)

## Comportamiento esperado
Nombres de constantes y códigos coinciden con el documento.

## Comportamiento observado
`RATE_STROKE_EVENTS_PER_SECOND`, `RATE_CHAT_MESSAGES` y `RATE_CHAT_WINDOW_MS` difieren de `RATE_STROKE_EVENTS` y `RATE_CHAT`. Hay constantes extra sin tabular. `STROKE_LIMIT` se confunde con el tope de puntos, que usa `STROKE_INVALID`.

## Evidencia
`shared/src/limits.ts` frente al ADR contrato.
