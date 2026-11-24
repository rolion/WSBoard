# PLAN-2026-11-24-pw-000-definicion-mvp

- Modo: **COMPLETO** (define contratos compartidos, autoridad del estado y fronteras entre módulos)
- Versión: 1
- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Decisiones: [ADR arquitectura](../adr/ADR-pw-000-definicion-mvp-arquitectura.md), [ADR contrato](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md), [DDR](../design/DDR-pw-000-definicion-mvp-experiencia.md)

## Objetivo de implementación

Dejar el contrato acordado **ejecutable y verificado**, sin construir
funcionalidad de producto: andamiaje del monorepo y paquete `shared/`.
Cliente y servidor reales pertenecen a tareas posteriores.

## Alcance

1. `CLAUDE.md` con reglas del repositorio (stack, comandos, convenciones,
   reglas de WebSocket y estado) y
   `.claude/skills/delivery-start/references/plantillas.md` (plantillas de
   TASK y PR que las skills ya referencian y no existen).
2. Monorepo npm workspaces (`client/`, `server/`, `shared/`), TypeScript
   estricto, Vitest. `client/` y `server/` solo con esqueleto y `package.json`.
3. `shared/`: `limits.ts`, `types.ts`, `schemas.ts` (zod), `errors.ts`,
   `events.ts` (nombres de evento y mapa de payloads) y `coords.ts`
   (normalización y escalado).
4. Pruebas unitarias del contrato.

Fuera de alcance: servidor Socket.IO, UI, Canvas, Playwright (ver decisión).

## Pasos

| # | Paso | Archivos | Depende de |
|---|---|---|---|
| 1 | Plantillas y `CLAUDE.md` | `CLAUDE.md`, `.claude/skills/delivery-start/references/plantillas.md` | — |
| 2 | Workspaces, `tsconfig.base.json`, scripts `test`, `typecheck`, `lint` | raíz, `*/package.json` | — |
| 3 | `shared/limits.ts`, `errors.ts`, `types.ts` | `shared/src/*` | 2 |
| 4 | `shared/schemas.ts` por evento C→S | `shared/src/schemas.ts` | 3 |
| 5 | `shared/coords.ts` | `shared/src/coords.ts` | 3 |
| 6 | Pruebas unitarias | `shared/test/*` | 4, 5 |

Dependencias nuevas (requieren confirmación en `delivery-build`): `typescript`,
`vitest`, `zod`; tipos y `eslint` según la convención que se elija en el paso 2.
`socket.io`, `react`, `vite` **no** se instalan en este TASK.

## Invariantes que el plan debe preservar

- I1: el servidor es la única autoridad de aliases, trazos, chat y `seq`.
- I2: ningún evento transporta imágenes; solo `Stroke`/`Point` normalizados.
- I3: coordenadas en `[0,1]`, lienzo lógico 16:9.
- I4: todo payload C→S se valida con el esquema de `shared/` antes de actuar.
- I5: el estado no se persiste.

## Estrategia de verificación

| Criterio | Verificación | Tipo |
|---|---|---|
| AC-1 Límites | `limits.test.ts`: valores de la tabla del ADR | Unitaria |
| AC-2 Alias | `alias.test.ts`: normalización NFKC, longitud, caracteres, espacios, unicidad insensible a mayúsculas (función de clave de alias) | Unitaria |
| AC-3 Validación de eventos | `schemas.test.ts`: cada evento acepta el caso válido y rechaza límites (65 puntos, color malo, ancho fuera de rango, texto vacío o de 501 caracteres, campos extra descartados) | Unitaria |
| AC-4 Coordenadas | `coords.test.ts`: ida y vuelta lógico↔píxel con tamaños 320×180, 800×450, 1000×700 (letterbox) y `devicePixelRatio` 2 | Unitaria |
| AC-5 Contrato completo | `events.test.ts`: todo evento del ADR tiene esquema/tipo y código de error declarado | Unitaria |
| AC-6 Documentación coherente | Revisión de `delivery-publish`: ADR, DDR, TASK y `shared/` coinciden (nombres de evento, errores, límites) | Revisión |
| AC-7 Política de reinicio | Documentada en ADR (D4) y reflejada en `errors.ts` (`SESSION_EXPIRED`) y `CLAUDE.md` | Revisión + AC-5 |

**Integración:** no aplica en este TASK (no hay servidor). Quedan
planificadas para las tareas de servidor las pruebas de: unicidad de alias con
dos clientes simultáneos, snapshot + eventos en vivo, `resume` dentro y fuera de
la gracia, `BOARD_FULL`, límites de tasa.

**Playwright:** **no corresponde** en este TASK (sin UI ni servidor). Es
obligatorio en las tareas posteriores de colaboración, con **dos contextos de
navegador independientes**, cubriendo entrada tardía y reconexión.

## Riesgos y mitigación

- *Contrato incompleto al implementar el servidor*: se versiona
  (`PROTOCOL_VERSION`) y cualquier cambio vuelve a `delivery-start`.
- *Límites mal calibrados*: viven en `limits.ts`; se ajustan sin tocar el protocolo.
- *Dependencias nuevas*: se pide confirmación antes de instalarlas.

## Historial del plan

- v1 (2026-11-24): versión inicial.
