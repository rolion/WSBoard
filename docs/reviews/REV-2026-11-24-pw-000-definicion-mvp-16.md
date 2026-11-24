# REV-2026-11-24-pw-000-definicion-mvp-16

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 895ae4b
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Cerrado (verificado en d110fd3)
- Criterio / plan vigente: AC-9 · PLAN-2026-11-24-pw-000-definicion-mvp v2
- Etapa responsable: — (cerrado)

## Comportamiento esperado
Las aserciones de `validation.test.ts` fallan si el comportamiento se rompe.

## Comportamiento observado
La prueba "solo devuelve códigos declarados" usa `if (!r.ok) expect(...)`, que es vacía si la entrada fuera válida. Faltan casos: `join` con payload `undefined` y `join` con `{ alias: 5 }` sin `protocol`.

## Evidencia
`shared/test/validation.test.ts:52-57`.
