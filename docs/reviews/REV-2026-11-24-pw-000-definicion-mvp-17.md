# REV-2026-11-24-pw-000-definicion-mvp-17

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: 895ae4b
- Severidad: Low
- Categoría: ARCHITECTURE
- Estado: Corregido (pendiente de verificación en delivery-publish)
- Criterio / plan vigente: ADR de ajustes A6; ADR de contrato (`session:join`) y arquitectura D7 · PLAN-2026-11-24-pw-000-definicion-mvp v2
- Etapa responsable: ARCHITECTURE (documental) → delivery-start

## Comportamiento esperado
La semántica de `snapshot.seq` frente a `presence:joined` está donde un implementador del servidor la busca.

## Comportamiento observado
Solo figura en A6 del ADR de ajustes. El ADR de contrato (`session:join`) y D7 no la mencionan; no hay contradicción porque ambos declaran que el ADR de ajustes prevalece.

## Evidencia
Revisión independiente de `895ae4b`. Propuesta: una frase en `session:join` y en D7 que remita a A6.
