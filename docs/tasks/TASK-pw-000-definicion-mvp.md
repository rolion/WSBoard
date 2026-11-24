# TASK-pw-000-definicion-mvp — Definición del MVP y decisiones técnicas

- Trello: [PW-000](https://trello.com/c/TBxriweK/1-pw-000-definici%C3%B3n-del-mvp-y-decisiones-t%C3%A9cnicas) (lista "Alcance y arquitectura")
- Rama: `task/TASK-pw-000-definicion-mvp`
- PR: [rolion/WSBoard#1](https://github.com/rolion/WSBoard/pull/1)
- Etapa actual: `PUBLISH` (supuestos S1–S6 aprobados por el usuario el 2026-11-24)
- Clasificación: `NEEDS_ARCHITECTURE`
- Diseño requerido: Sí (DDR de pantallas y estados)
- Plan: [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md) (COMPLETO)
- Specification readiness: `READY` (supuestos S1–S6 aprobados el 2026-11-24)

## Investigación

**Estado del repositorio** (rama `task/TASK-pw-000-definicion-mvp`, commits
`27dd363`, `bb55d3d`):

- Existe solo `README.md:1` (`# WSBoard`) y las tres skills en
  `.claude/skills/delivery-{start,build,publish}/SKILL.md`.
- **No existen**: código (React, Canvas, WebSocket), pruebas, contratos,
  `CLAUDE.md`, `docs/`, ni
  `.claude/skills/delivery-start/references/plantillas.md`, aunque las tres
  skills lo referencian (`delivery-start/SKILL.md:7`,
  `delivery-build/SKILL.md:18-19`, `delivery-publish/SKILL.md:19-20`).
  Se usó la estructura implícita de las skills (`## Investigación`,
  `## Implementación`, `## Review`, `## Publicación`, `## Testing

Commit revisado: `21a7bdf` (revisión previa sobre `94df2aa`).

| Verificación | Comando | Resultado |
|---|---|---|
| Unitarias (AC-1 a AC-7 y hallazgos corregidos) | `npm test` | PASS: 6 archivos, 51 pruebas |
| Tipos | `npm run typecheck` | PASS |
| Seguridad de dependencias | `npm audit` | PASS: 0 vulnerabilidades |
| Higiene del diff | `git ls-files` (`.env`, logs, `dist/`, `node_modules/`) | PASS |
| Bytes de `schemas.ts` | `grep -c` de U+2028/U+2029 literales (revisor) | PASS: 0 |
| Lint | — | NO EJECUTADA: no existe `lint` (decisión del usuario; deuda registrada) |
| Integración | — | NO APLICA: sin servidor (ver plan) |
| Playwright | — | NO APLICA: sin UI ni servidor (ver plan) |
| Revisión visual | — | NO APLICA: sin cambios de UI |

## Review

**Veredicto: PASS** (2026-11-24, commit revisado `21a7bdf`). Segunda revisión
independiente, con subagente de contexto limpio y sin permisos de edición, sobre
las correcciones de `94df2aa..21a7bdf`. Sin hallazgos Critical, High ni Medium nuevos.

Cerrados (verificados): REV-02, 08, 09, 10. REV-11 cerrado parcialmente.
Nuevos, Low: REV-12 (prueba de alias parcialmente circular) y REV-13 (marcas
combinantes al inicio de palabra sin precisar).

| REV | Severidad | Categoría | Estado | Etapa |
|---|---|---|---|---|
| [01](../reviews/REV-2026-11-24-pw-000-definicion-mvp-01.md) | Medium | ARCHITECTURE | Abierto | delivery-start |
| [02](../reviews/REV-2026-11-24-pw-000-definicion-mvp-02.md) | Medium | PLAN / IMPLEMENTATION | Cerrado | — |
| [03](../reviews/REV-2026-11-24-pw-000-definicion-mvp-03.md) | Medium | SPECIFICATION | Abierto | delivery-start |
| [04](../reviews/REV-2026-11-24-pw-000-definicion-mvp-04.md) | Medium | SPECIFICATION | Abierto | delivery-start |
| [05](../reviews/REV-2026-11-24-pw-000-definicion-mvp-05.md) | Medium | SPECIFICATION | Abierto | delivery-start |
| [06](../reviews/REV-2026-11-24-pw-000-definicion-mvp-06.md) | Low | SPECIFICATION | Abierto | delivery-start |
| [07](../reviews/REV-2026-11-24-pw-000-definicion-mvp-07.md) | Low | SPECIFICATION | Abierto | delivery-start |
| [08](../reviews/REV-2026-11-24-pw-000-definicion-mvp-08.md) | Low | IMPLEMENTATION | Cerrado | — |
| [09](../reviews/REV-2026-11-24-pw-000-definicion-mvp-09.md) | Low | IMPLEMENTATION | Cerrado | — |
| [10](../reviews/REV-2026-11-24-pw-000-definicion-mvp-10.md) | Low | IMPLEMENTATION | Cerrado | — |
| [11](../reviews/REV-2026-11-24-pw-000-definicion-mvp-11.md) | Low | IMPLEMENTATION | Parcial | delivery-start (resto) |
| [12](../reviews/REV-2026-11-24-pw-000-definicion-mvp-12.md) | Low | IMPLEMENTATION | Abierto | delivery-build |
| [13](../reviews/REV-2026-11-24-pw-000-definicion-mvp-13.md) | Low | IMPLEMENTATION | Abierto | delivery-build |

Los abiertos de categoría `SPECIFICATION` y `ARCHITECTURE` cambian el contrato
aprobado y requieren aprobación explícita antes de modificarse.

## Publicación

PR [rolion/WSBoard#1](https://github.com/rolion/WSBoard/pull/1) listo para revisión
humana. El merge es manual.

- Plan: [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md)
- Decisiones: ADR de arquitectura y de contrato, DDR (ver `## Decisiones`).
- Limitaciones: sin lint, integración ni Playwright (no aplican aún).
- Abiertos: 5 Medium/Low de Specification o arquitectura (REV-01, 03, 04, 05; 06 y 07 Low),
  más REV-11 (resto), 12 y 13 Low de implementación.
- A revisar por quien apruebe: REV-01, 03, 04 y 05 (tocan el contrato) y la política de
  reinicio (ADR arquitectura D4).

## Historial

| Fecha | Transición | Nota |
|---|---|---|
| 2026-11-24 | INVESTIGATION → DESIGN → ARCHITECTURE → PLANNING | Documentación inicial; Specification `READY` con supuestos S1–S6 |
| 2026-11-24 | PLANNING → ENGINEERING | Usuario aprueba S1–S6 y confirma Socket.IO (S1) frente a `ws`. ADR y DDR pasan a `Aceptado` |
| 2026-11-24 | ENGINEERING → REVIEW | `shared/` implementado; 35 pruebas y typecheck en PASS |
| 2026-11-24 | REVIEW → PUBLISH | Veredicto PASS en `94df2aa`; 11 hallazgos abiertos (5 Medium, 6 Low) en `docs/reviews/` |
| 2026-11-24 | PUBLISH → ENGINEERING → REVIEW | Corrección de REV-02, 08, 09, 10 y 11 (parcial); 51 pruebas y typecheck en PASS |
| 2026-11-24 | REVIEW → PUBLISH | Veredicto PASS en `21a7bdf`; REV-02, 08, 09, 10 cerrados; REV-12 y 13 (Low) nuevos |
