# REV-2026-11-24-pw-000-definicion-mvp-06

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Low
- Categoría: SPECIFICATION
- Estado: Resuelto por ADR de ajustes A5 y verificado en tests de shared/ (pendiente de verificación en delivery-publish)
- Criterio / plan vigente: ADR contrato, `presence:left` y `session:resume` · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: SPECIFICATION → delivery-start (quitar o definir)

## Comportamiento esperado
Todos los valores del contrato se emiten o se usan.

## Comportamiento observado
`reason: "replaced"` nunca se emite (un `resume` sobre token activo mantiene al participante). `lastSeq` se ignora porque el snapshot siempre es completo.

## Evidencia
Revisión independiente sobre el ADR contrato.
