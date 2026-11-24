# TASK-pw-000-definicion-mvp — Definición del MVP y decisiones técnicas

- Trello: [PW-000](https://trello.com/c/TBxriweK/1-pw-000-definici%C3%B3n-del-mvp-y-decisiones-t%C3%A9cnicas) (lista "Alcance y arquitectura")
- Rama: `task/TASK-pw-000-definicion-mvp`
- PR: _(se registra al abrirlo)_
- Etapa actual: `PLANNING` (pendiente de aprobación de la Specification)
- Clasificación: `NEEDS_ARCHITECTURE`
- Diseño requerido: Sí (DDR de pantallas y estados)
- Plan: [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md) (COMPLETO)
- Specification readiness: `READY` (con supuestos S1–S6 sujetos a aprobación explícita)

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
  `## Implementación`, `## Review`, `## Publicación`, `## Testing`,
  `## Changes`) y se crea la plantilla en el plan.
- No hay ADR ni DDR previos que respetar.

**Requisitos de la tarjeta** (fuente de requisitos): pizarra compartida en
tiempo real, usuarios por alias, chat y presencia; sala pública única; sin
cuentas ni persistencia; sesiones en memoria; stack propuesto React + TS +
Canvas 2D + Node.js con Socket.IO/WebSocket; servidor autoritativo de aliases
y estado; sin imágenes completas por movimiento; eventos estructurados de
trazos; snapshot al entrar; límites de eventos y payloads. Criterio de salida:
arquitectura, contrato de eventos, definición de sala y política de reinicio
acordadas. La tarjeta no tiene checklists ni comentarios.

**Veredicto**

- `NEEDS_ARCHITECTURE`: fija quién controla el estado compartido, su
  (no) persistencia y la estrategia de sincronización.
- Diseño: requerido, porque define las pantallas y estados visibles.

**Supuestos (a confirmar al aprobar la Specification)**

| ID | Supuesto | Dónde |
|---|---|---|
| S1 | Socket.IO (solo `websocket`) en lugar de `ws` | ADR arquitectura D1 |
| S2 | Reglas de alias: 2–20 caracteres, letras/dígitos/espacio/`_-.`, único sin distinguir mayúsculas | ADR contrato |
| S3 | La sala vacía conserva su estado hasta reiniciar el proceso | ADR arquitectura D4 |
| S4 | Sin "limpiar pizarra", deshacer, formas, texto ni exportar en el MVP | Specification |
| S5 | Gracia de reconexión de 30 s; tope de 5 000 trazos y 30 participantes | ADR arquitectura |
| S6 | Una pestaña = un participante (token en `sessionStorage`) | ADR arquitectura D5 |

## Specification

**Alcance (MVP):** una sala pública `main`, participantes por alias, pizarra
con lápiz y borrador, chat de texto, lista de presencia, servidor autoritativo,
estado en memoria.

**Fuera de alcance:** cuentas, múltiples salas, persistencia (dibujos, chat,
sesiones), limpiar o deshacer, formas, texto en la pizarra, imágenes, exportar,
moderación, escalado horizontal, cifrado de aplicación.

**Criterios de aceptación de este TASK** (el contrato es el entregable):

- **AC-1** Los límites de la tabla del ADR de contrato existen como constantes
  únicas compartidas por cliente y servidor.
- **AC-2** El alias se normaliza y valida con las reglas de S2, y existe una
  clave de comparación insensible a mayúsculas.
- **AC-3** Cada evento C→S tiene un esquema de validación que rechaza payloads
  fuera de límites y descarta campos desconocidos.
- **AC-4** Las coordenadas se expresan en `[0,1]` sobre un lienzo 16:9 y hay
  conversión a píxeles con letterbox y `devicePixelRatio`.
- **AC-5** Todos los eventos y códigos de error del ADR de contrato están
  declarados en `shared/` y coinciden con el documento.
- **AC-6** ADR, DDR, TASK y `shared/` son coherentes entre sí.
- **AC-7** La política de reinicio (D4) está documentada y reflejada en el
  contrato (`SESSION_EXPIRED`) y en `CLAUDE.md`.

**Comportamiento del producto que el contrato debe permitir** (para tareas
futuras): alias único entre participantes activos; snapshot al entrar (con
trazos abiertos); trazos en tiempo real entre dos navegadores; chat difundido
a todos en el mismo orden; reconexión < 30 s conserva alias; > 30 s o reinicio
libera el alias y vuelve a la entrada.

**Casos límite:** alias duplicado concurrente (gana el primero en llegar al
servidor); entrada mientras alguien dibuja; autor que se desconecta con un
trazo abierto; trazo enorme; sala llena; payload malformado o > 16 KiB; reinicio
con clientes conectados; pestaña duplicada con el mismo token; reintento de
chat tras perder el ack.

## Test Specification

Ver la estrategia del [plan](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md#estrategia-de-verificación).
Playwright **no corresponde** en este TASK; es obligatorio (dos contextos
independientes, entrada tardía y reconexión) en las tareas de colaboración.

## Implementation Plan

Ver [PLAN-2026-11-24-pw-000-definicion-mvp](../plans/PLAN-2026-11-24-pw-000-definicion-mvp.md) (COMPLETO, v1).

## Decisiones

- [ADR arquitectura](../adr/ADR-pw-000-definicion-mvp-arquitectura.md)
- [ADR contrato de eventos](../adr/ADR-pw-000-definicion-mvp-contrato-eventos.md)
- [DDR experiencia](../design/DDR-pw-000-definicion-mvp-experiencia.md)

## Implementación

_(lo completa `delivery-build`)_

## Testing

_(lo completa `delivery-publish`)_

## Review

_(lo completa `delivery-publish`)_

## Publicación

_(lo completa `delivery-publish`)_

## Historial

| Fecha | Transición | Nota |
|---|---|---|
| 2026-11-24 | INVESTIGATION → DESIGN → ARCHITECTURE → PLANNING | Documentación inicial; Specification `READY` con supuestos S1–S6 |
