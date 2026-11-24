# REV-2026-11-24-pw-000-definicion-mvp-15

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 895ae4b
- Severidad: Medium
- Categoría: SPECIFICATION / IMPLEMENTATION
- Estado: Resuelto por la aclaración de A2 (ADR de ajustes) y pruebas; pendiente de verificación en delivery-publish
- Criterio / plan vigente: AC-9; ADR de ajustes A2 (última fila y filas de `stroke:*` y `chat:send`) · PLAN-2026-11-24-pw-000-definicion-mvp v2
- Etapa responsable: SPECIFICATION → delivery-start (aclaración de A2), luego delivery-build

## Comportamiento esperado
A2 define sin ambigüedad el código para un payload que no es un objeto.

## Comportamiento observado
La última fila de A2 manda `PAYLOAD_INVALID` para payloads que no son un objeto, pero las filas de `stroke:*` y `chat:send` mandan `STROKE_INVALID` y `CHAT_INVALID` para cualquier fallo. La implementación sigue las filas por evento. `shared/test/validation.test.ts` (prueba "payloads no objeto…") incluye `stroke:start` con `"texto"` esperando `STROKE_INVALID`, lo que contradice el nombre de la prueba.

## Evidencia
ADR de ajustes A2; `shared/test/validation.test.ts:43-48`. Propuesta: aclarar en A2 que el mapeo por evento prevalece, y mover la aserción a la prueba de trazos. Aclarar A2 cambia la Specification y requiere aprobación explícita.
