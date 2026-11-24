# REV-2026-11-24-pw-000-definicion-mvp-02

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 94df2aa
- Severidad: Medium
- Categoría: PLAN / IMPLEMENTATION
- Estado: Abierto (permitido por el gate; no bloquea PASS)
- Criterio / plan vigente: AC-5; plan, alcance 3 (`events.ts` con mapa de payloads) · PLAN-2026-11-24-pw-000-definicion-mvp v1
- Etapa responsable: IMPLEMENTATION → delivery-build (completar tipos y pruebas)

## Comportamiento esperado
`events.ts` declara esquema o tipo para todos los eventos, incluidos payloads S→C, `error` y respuestas de ack.

## Comportamiento observado
Solo hay esquemas C→S y nombres S→C. Faltan tipos de payload de `presence:*`, `stroke:started|appended|ended`, `chat:message`, `seq:advance`, `error` y de los acks. El TASK dice que todos los eventos están declarados y no registra la desviación; `events.test.ts` solo verifica nombres.

## Evidencia
`shared/src/events.ts`, `shared/test/events.test.ts`.
