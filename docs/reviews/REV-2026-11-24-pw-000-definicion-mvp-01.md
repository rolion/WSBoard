# REV-2026-11-24-pw-000-definicion-mvp-01

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Medium
- Categoría: ARCHITECTURE
- Estado: Cerrado (verificado en 895ae4b)
- Criterio / plan vigente: ADR arquitectura D7 y D8; ADR contrato, tabla de límites · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: — (cerrado)

## Comportamiento esperado
El snapshot completo (D7) tiene tamaño acotado.

## Comportamiento observado
5 000 trazos × 5 000 puntos permite ~25 M de puntos; no hay tope agregado de puntos por sala. `MAX_MESSAGE_BYTES` solo limita mensajes entrantes, no el snapshot.

## Evidencia
Revisión independiente (subagente) sobre ADR y `shared/src/limits.ts`. Propuesta: tope agregado de puntos o recalibrar `MAX_STROKES` / `MAX_POINTS_PER_STROKE`.
