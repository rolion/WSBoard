# Plantillas

## TASK (`docs/tasks/TASK-<slug>.md`)

```markdown
# TASK-<slug> — <título>

- Trello: [PW-XXX](<url>)
- Rama: `task/TASK-<slug>`
- PR: <enlace>
- Etapa actual: INVESTIGATION | DESIGN | ARCHITECTURE | PLANNING | ENGINEERING | REVIEW | PUBLISH
- Clasificación: TRIVIAL_FIX | NEEDS_PLAN | NEEDS_ARCHITECTURE
- Diseño requerido: Sí | No
- Plan: <enlace> (COMPACTO | COMPLETO)
- Specification readiness: READY | BLOCKED

## Investigación
## Specification
## Test Specification
## Implementation Plan
## Decisiones
## Implementación
## Testing
## Review
## Publicación
## Historial
| Fecha | Transición | Nota |
```

## PR

```markdown
## Summary
## Changes        <!-- lo mantiene delivery-build -->
## Testing        <!-- lo mantiene delivery-publish -->
## Review         <!-- lo mantiene delivery-publish -->
## Publicación

Enlaces: TASK, plan, ADR, DDR.
```

## Plan (`docs/plans/PLAN-<YYYY-MM-DD>-<slug>.md`)

COMPACTO: objetivo, alcance, pasos y verificación por criterio.
COMPLETO: lo anterior más invariantes, dependencias entre pasos, riesgos,
mitigación, historial de versiones.

## REV (`docs/reviews/REV-<fecha>-<task-slug>-<seq>.md`)

Severidad, categoría, criterio y plan vigente (o `N/A`), esperado, observado,
evidencia, etapa responsable.
