# REV-2026-11-24-pw-000-definicion-mvp-10

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Abierto (permitido por el gate; no bloquea PASS)
- Criterio / plan vigente: AC-4 (coordenadas); AC-2 (alias) · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: IMPLEMENTATION → delivery-build (proteger `NaN`; documentar o aceptar `\p{M}`)

## Comportamiento esperado
`toLogical` nunca devuelve `NaN`; la regla de alias tiene decisión explícita sobre marcas combinantes.

## Comportamiento observado
`toLogical` propaga `NaN`. La regex rechaza `\p{M}` (hindi, tailandés) sin que esté documentado.

## Evidencia
`shared/src/coords.ts:37-41`; `shared/src/schemas.ts`.
