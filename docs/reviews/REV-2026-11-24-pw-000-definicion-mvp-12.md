# REV-2026-11-24-pw-000-definicion-mvp-12

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 21a7bdf
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Cerrado (verificado en d110fd3)
- Criterio / plan vigente: AC-2 · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: — (cerrado)

## Comportamiento esperado
La prueba de alias con extremos `.` y `-` usa oráculos independientes del código.

## Comportamiento observado
`shared/test/hardening.test.ts` (prueba "extremos `.` y `-`") calcula la expectativa con `/[\p{L}\p{N}]/u`, equivalente al lookahead de `ALIAS_PATTERN` en `shared/src/schemas.ts`. Es parcialmente circular, aunque los casos son correctos (`.a`, `a-`, `-x-` válidos; `--`, `..` inválidos).

## Evidencia
Revisión independiente de `21a7bdf`. Mitigación: sustituir por booleanos literales.
