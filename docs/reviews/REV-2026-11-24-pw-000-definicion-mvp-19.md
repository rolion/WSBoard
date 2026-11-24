# REV-2026-11-24-pw-000-definicion-mvp-19

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 0ef6a67
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Corregido (pendiente de verificación en delivery-publish)
- Criterio / plan vigente: AC-9 · PLAN-2026-11-24-pw-000-definicion-mvp v2.1
- Etapa responsable: IMPLEMENTATION → delivery-build (la parte de redacción de A2 y del ADR de contrato requiere aprobación si cambia el sentido)

## Comportamiento esperado
Los payloads que no son un objeto de `session:join` y `session:resume` están protegidos contra regresiones por pruebas, y la redacción del contrato enumera sus casos de forma coherente.

## Comportamiento observado
- Cobertura: `shared/test/validation.test.ts:42-45` solo prueba `session:join` con `null`. Faltan `undefined`, `"x"`, `42` y `[]` en `session:join`, y `"x"`, `42`, `undefined` y `[]` en `session:resume`. El revisor comprobó con una prueba temporal que el código se comporta como A2; solo falta fijarlo.
- Redacción: la fila de `session:join` en A2 enumera `null`, `undefined`, cadena y número, y omite `[]` y booleanos (la regla de precedencia sí los cubre). El ADR de contrato define `PAYLOAD_INVALID` como "esquema no cumplido en eventos sin código propio", aunque `session:join` también lo usa; remite a A2, que lo aclara.

## Evidencia
Revisión independiente de `0ef6a67`: `session:join` con `null`, `undefined`, `"x"`, `42`, `[]`, `true` → `PAYLOAD_INVALID`; con `{}` → `PROTOCOL_MISMATCH`. Corrección propuesta: ampliar las pruebas; completar la enumeración en A2 (matiz de redacción, sin cambio de comportamiento).
