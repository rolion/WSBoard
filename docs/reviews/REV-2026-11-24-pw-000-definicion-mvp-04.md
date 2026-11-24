# REV-2026-11-24-pw-000-definicion-mvp-04

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Medium
- Categoría: SPECIFICATION
- Estado: Cerrado (verificado en 895ae4b)
- Criterio / plan vigente: ADR contrato, límites (3 mensajes excesivos seguidos) · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: — (cerrado)

## Comportamiento esperado
Regla de desconexión por mensajes de tamaño excesivo que sea alcanzable.

## Comportamiento observado
Con `maxHttpBufferSize` de Socket.IO, el primer mensaje que lo excede cierra la conexión; "3 seguidos" es inalcanzable. `MAX_MESSAGE_BYTES` no tiene verificación.

## Evidencia
Revisión independiente sobre el ADR contrato.
