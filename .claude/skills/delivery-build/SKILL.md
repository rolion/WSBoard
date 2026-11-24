---
name: delivery-build
description: >-
  Segunda etapa de entrega de Port Webhook, una pizarra colaborativa con React,
  TypeScript, Canvas y WebSocket. Implementa el plan de un TASK cuya
  Specification está READY, o un TRIVIAL_FIX a partir de su investigación.
  Implementa las pruebas del task, actualiza el PR único y continúa con
  delivery-publish. Devuelve a delivery-start los cambios que requieran
  revisar la Specification, el plan, el diseño o la arquitectura.
argument-hint: "TASK-<slug>"
---

# Delivery Build

Etapa `ENGINEERING` del flujo
`delivery-start → delivery-build → delivery-publish`.

Lee `CLAUDE.md` y las plantillas de TASK y PR en
`.claude/skills/delivery-start/references/plantillas.md`.
La Specification define el comportamiento y `delivery-publish` emite
el resultado de la revisión.

## 1. Leer el TASK y preparar la rama

Lee `docs/tasks/TASK-<slug>.md` y revisa `git status`.
Preserva los cambios ajenos al TASK. Si interfieren con el cambio de
rama o con la implementación, registra el bloqueo.

- `TRIVIAL_FIX`: exige `## Investigación` con criterio de aceptación y
  verificación. Usa `task/TASK-<slug>` desde la rama base del repositorio.
  Reutiliza la rama y el PR si ya existen. En caso contrario, abre el PR
  tras el primer commit y registra el enlace en el TASK.
- `NEEDS_PLAN` o `NEEDS_ARCHITECTURE`: exige un plan completo para su modo,
  `Specification readiness: READY`, rama y PR registrados. Actualiza las
  referencias remotas y confirma que la rama coincide con la del PR.
  Si falta documentación, devuelve el TASK a `delivery-start`.
- `BLOCKED`: conserva las preguntas abiertas y espera una decisión.
  Si un `TRIVIAL_FIX` resulta más complejo, documenta por qué y devuelve
  el TASK a `delivery-start` para reclasificarlo.

## 2. Entender antes de implementar

Lee la Specification, la Test Specification, el Implementation Plan y
los DDR o ADR aplicables. Un plan `COMPACTO` requiere criterios de
aceptación verificables. Aplica las secciones que correspondan a su modo.

Comprueba que las rutas, interfaces y decisiones del plan siguen
vigentes. Usa las dependencias y convenciones del repositorio. Si hace
falta instalar una dependencia nueva, solicita confirmación antes de
instalarla.

## 3. Implementar dentro del alcance

**React y Canvas**

- Respeta la estructura existente y reutiliza componentes y hooks.
  Mantén la lógica de dibujo y de conexión fuera de los componentes
  visuales cuando corresponda a la estructura del proyecto.
- Si cambias el ciclo de vida de la conexión, limpia listeners, timers y
  sockets según quién sea su propietario. Comprueba que montar y desmontar
  la vista no duplica suscripciones ni conexiones.
- Si cambias el dibujo, aplica el sistema de coordenadas del plan.
  Verifica el comportamiento con distintos tamaños de lienzo cuando
  el criterio de aceptación lo requiera.
- Para cambios visuales, lee `docs/design/design-system.md` si existe y
  sigue el DDR aplicable. Reutiliza componentes y tokens. Cubre los
  estados previstos y da nombres accesibles a los controles por icono.

**WebSocket y servidor**

- Mantén alineados los tipos de cliente y servidor. Valida los mensajes
  entrantes en tiempo de ejecución y aplica en el servidor las reglas de
  sesión y estado definidas en la Specification.
- Para ingreso, chat, trazos o presencia, respeta los destinatarios, el
  orden y el manejo de errores definidos en el contrato.
- Si el plan incluye sincronización inicial o reconexión, implementa la
  coordinación entre el estado inicial y los eventos en vivo según el
  ADR. Lleva a `delivery-start` cualquier cambio necesario en el
  protocolo o en quién controla el estado compartido.

Mantén el diff acotado al TASK. Registra la deuda técnica que descubras
en `## Implementación`. Preserva `.env`, credenciales y secretos.

## 4. Ejecutar las pruebas del plan

Implementa una verificación por cada criterio de aceptación según la
Test Specification. Usa los scripts y utilidades del repositorio.

- Unitarias para lógica aislada, como coordenadas o validación de mensajes.
- Integración para eventos, respuestas y cambios de estado del servidor.
- Playwright cuando el plan lo indique. Para colaboración, usa dos
  contextos independientes y verifica el efecto desde ambos. Usa
  aserciones sobre un estado observable en lugar de esperas fijas.
- Para `TRIVIAL_FIX`, ajusta una prueba existente si su cobertura cambia.

Registra los comandos, resultados y limitaciones en `## Implementación`.
Corrige las fallas atribuibles al cambio antes de pasar a `REVIEW`.
El Quality Gate corresponde a `delivery-publish`.

## 5. Devolver el TASK a delivery-start cuando corresponda

- Detalle técnico que conserva alcance, comportamiento y riesgo:
  resuélvelo y documenta la desviación si es relevante.
- Plan incompleto, pasos inviables o modo `COMPACTO` insuficiente:
  `PLAN_UPDATE_REQUIRED` → `PLANNING`.
- Criterio, invariante o contrato contradictorio o ambiguo:
  `PLAN_UPDATE_REQUIRED` → `PLANNING`. Identifica el punto de la
  Specification que necesita aprobación explícita.
- Problema de arquitectura: `ARCHITECTURE_REVIEW_REQUIRED` → `ARCHITECTURE`.
- Problema de diseño: `DESIGN_REVIEW_REQUIRED` → `DESIGN`.

Registra el hallazgo, su evidencia, el impacto y la transición en el TASK.
Puedes continuar con trabajo independiente del bloqueo. Invoca
`delivery-start TASK-<slug>` y deja la parte afectada pendiente de la
decisión. Conserva la rama y el PR existentes.

## 6. Registrar, subir y continuar

1. Revisa `git status` y `git diff`. Incluye solo los archivos del TASK.
2. Completa `## Implementación` con cambios, criterios cubiertos, pruebas
   ejecutadas, desviaciones justificadas y deuda técnica. Si hubo cambios
   visuales, registra la referencia de diseño y los componentes reutilizados.
3. Registra la transición `ENGINEERING → REVIEW` antes del commit final.
   Referencia `TASK-<slug>` en los commits y haz push a la rama del PR.
4. Actualiza `## Changes` del PR preservando las demás secciones. Para un
   `TRIVIAL_FIX` con PR recién creado, verifica que el enlace quedó
   registrado y subido en el TASK.
5. Resume el estado e invoca `delivery-publish TASK-<slug>` sin esperar
   confirmación.