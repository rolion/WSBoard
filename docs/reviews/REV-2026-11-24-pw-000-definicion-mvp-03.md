# REV-2026-11-24-pw-000-definicion-mvp-03

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Medium
- Categoría: SPECIFICATION
- Estado: Cerrado (verificado en 895ae4b)
- Criterio / plan vigente: ADR contrato, convenciones y códigos de error · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: — (cerrado)

## Comportamiento esperado
Regla clara para elegir entre `PROTOCOL_MISMATCH`, `ALIAS_INVALID`, `STROKE_INVALID`, `CHAT_INVALID` y `PAYLOAD_INVALID` cuando falla un esquema.

## Comportamiento observado
No hay regla de mapeo. `joinPayloadSchema` mezcla protocolo y alias en un solo parse; solo se distinguen inspeccionando `issue.path`.

## Evidencia
Revisión independiente sobre ADR contrato y `shared/src/schemas.ts`. Propuesta: regla en el ADR y helper en `shared/`.
