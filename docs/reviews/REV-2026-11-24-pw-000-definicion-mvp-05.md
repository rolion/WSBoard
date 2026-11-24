# REV-2026-11-24-pw-000-definicion-mvp-05

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Medium
- Categoría: SPECIFICATION
- Estado: Resuelto por ADR de ajustes A4 y verificado en tests de shared/ (pendiente de verificación en delivery-publish)
- Criterio / plan vigente: ADR contrato, `stroke:points` y `stroke:end` · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: SPECIFICATION → delivery-start (requiere aprobación explícita)

## Comportamiento esperado
Se define si el cierre forzado de un trazo (exceso de puntos o caducidad de la gracia) difunde `stroke:ended` y con qué `seq`.

## Comportamiento observado
El ADR no lo dice para el exceso de puntos; los demás clientes verían el trazo abierto indefinidamente. Para la gracia sí difunde, sin precisar `seq`.

## Evidencia
Revisión independiente sobre el ADR contrato.
