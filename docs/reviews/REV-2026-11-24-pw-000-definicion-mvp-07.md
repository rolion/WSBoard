# REV-2026-11-24-pw-000-definicion-mvp-07

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Low
- Categoría: SPECIFICATION
- Estado: Cerrado (verificado en 895ae4b)
- Criterio / plan vigente: ADR contrato, tabla S→C y nota de `seq:advance` · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: — (cerrado)

## Comportamiento esperado
`seq:advance` figura en la tabla con payload y regla de `seq`; el snapshot cubre el `seq` de `presence:joined` propio.

## Comportamiento observado
`seq:advance` solo aparece en una nota, sin payload ni indicar si consume `seq` propio.

## Evidencia
Revisión independiente sobre el ADR contrato.
