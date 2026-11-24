# REV-2026-11-24-pw-000-definicion-mvp-13

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 21a7bdf
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Corregido en delivery-build (pendiente de verificación en delivery-publish)
- Criterio / plan vigente: AC-2 · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: IMPLEMENTATION → delivery-build (o documentar en el ADR)

## Comportamiento esperado
Decisión explícita sobre la posición de las marcas combinantes en el alias.

## Comportamiento observado
`ALIAS_PATTERN` (`shared/src/schemas.ts`) permite `\p{M}` también al inicio de una palabra, por ejemplo una marca antes de una letra. Es inocuo, pero el ADR no lo precisa.

## Evidencia
Revisión independiente de `21a7bdf`. No requiere acción urgente: aceptar y documentar, o exigir letra o dígito al inicio de cada palabra.
