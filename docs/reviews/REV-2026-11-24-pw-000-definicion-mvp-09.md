# REV-2026-11-24-pw-000-definicion-mvp-09

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Corregido en delivery-build (pendiente de verificación en delivery-publish)
- Criterio / plan vigente: ADR contrato, `chat:send` (sin caracteres de control salvo salto de línea) · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: IMPLEMENTATION → delivery-build

## Comportamiento esperado
El texto no contiene separadores de línea inesperados.

## Comportamiento observado
`chatTextSchema` acepta U+0085, U+2028 y U+2029. Gravedad baja: el cliente escapa el texto.

## Evidencia
Sondeo del revisor; `shared/src/schemas.ts`.
