---
name: delivery-start
description: >-
  Primera etapa de entrega de Port Webhook, una pizarra colaborativa con React,
  TypeScript, Canvas y WebSocket. Investiga una tarea, aclara decisiones de
  producto, registra decisiones de diseño y arquitectura cuando aplican, y
  produce una especificación verificable y un plan de implementación.
  Cuando la especificación queda READY, abre o reutiliza el PR de la tarea
  y continúa con delivery-build. Úsala para tareas nuevas y al retomar
  investigación, diseño, arquitectura o planificación.
argument-hint: "<descripción de la tarea> | <URL de tarjeta de Trello> [aclaraciones] | TASK-<slug>"
---

# Delivery Start

Cubre INVESTIGATION → DESIGN → ARCHITECTURE → PLANNING del flujo
`delivery-start → delivery-build → delivery-publish`.

Lee `CLAUDE.md`, la documentación aplicable y
`references/plantillas.md` antes de escribir. Esta etapa solo modifica
documentación. Cada tarea tiene una rama `task/TASK-<slug>` y un solo PR.

## 1. Ubicar o crear la tarea

- Con `TASK-<slug>`, lee `docs/tasks/TASK-<slug>.md` y retoma su etapa actual.
  Si el archivo no existe, informa el bloqueo.
- Con una URL de tarjeta de Trello, lee el título, descripción, checklists y
  comentarios relevantes. Registra la URL y el ID `PW-XXX`. Busca primero
  una tarea con la misma URL o el mismo ID. Trata la tarjeta como fuente de
  requisitos. Si no es accesible, pide que el usuario pegue su contenido.
- Con una descripción, crea un slug descriptivo en kebab-case. Reutiliza el
  TASK cuando corresponda al mismo requerimiento. Si el slug ya pertenece
  a otra tarea, usa un sufijo disponible.

## 2. Investigar

- Inspecciona la estructura real del repositorio. Cita `archivo:línea`
  para los hechos sobre el código y registra los supuestos por separado.
- Identifica los componentes React, el código de Canvas, el cliente y
  servidor WebSocket, los contratos y las pruebas que la tarea afecta.
  En un repositorio nuevo, registra qué existe y qué falta por decidir.
- Agrupa tus preguntas cuando falte información para investigar, haya una
  decisión de producto abierta o haga falta cambiar una Specification
  existente. Resuelve y documenta las decisiones técnicas rutinarias.
- Clasifica el cambio como `TRIVIAL_FIX`, `NEEDS_PLAN` o
  `NEEDS_ARCHITECTURE`. Cambiar quién controla el estado compartido, su
  persistencia o la estrategia de sincronización requiere arquitectura.
- Marca diseño como requerido si cambian pantallas, flujos de interacción
  o estados visibles relevantes. Registra el veredicto en el TASK.

## 3. Diseñar si corresponde

Define qué ve y qué puede hacer cada participante. Usa el sistema de diseño
y los componentes existentes cuando estén disponibles. Para cambios en la
pizarra, el chat o la lista de participantes, cubre los estados que afecte
la tarea, como nombre ocupado, conectando, conectado y reconectando.

Registra la decisión en
`docs/design/DDR-<task-slug>-<decision-slug>.md`.

## 4. Resolver arquitectura si corresponde

Consulta los ADR vigentes. Compara opciones y registra la decisión en
`docs/adr/ADR-<task-slug>-<decision-slug>.md`. Para cambios sensibles,
especifica cómo revertir o mitigar el impacto.

Cuando cambie un contrato WebSocket, especifica los eventos afectados:
emisor, destinatarios, payload, validación y comportamiento ante errores.
Para cambios de sincronización, define quién mantiene el estado, qué recibe
quien entra tarde y qué ocurre si coinciden la carga inicial y los eventos
en vivo. Si hay reconexión, define cómo se retoma la sesión y cómo se
evitan duplicados cuando corresponda.

## 5. Especificar y planificar

- Escribe la Specification con alcance, criterios de aceptación y casos
  límite. Marca `READY` cuando el comportamiento sea implementable.
  Si una decisión de producto sigue abierta, marca `BLOCKED`, registra
  las preguntas y espera la respuesta.
- Usa un plan `COMPACTO` para cambios acotados y `COMPLETO` si cambian
  invariantes, transiciones de estado, contratos compartidos, fronteras
  entre módulos o decisiones relevantes de diseño o arquitectura.
- Asigna una verificación a cada criterio de aceptación. Usa pruebas
  unitarias para lógica aislada y de integración para eventos y estado
  del servidor. Decide explícitamente si corresponde Playwright. Para
  flujos críticos de colaboración, verifica con dos contextos de navegador
  independientes. Cubre entrada tardía o reconexión cuando el cambio toque
  esos comportamientos.
- Para tareas con plan, escríbelo en
  `docs/plans/PLAN-<YYYY-MM-DD>-<slug>.md` y enlázalo desde el TASK.

## 6. Entregar

- `READY` con plan: crea o reutiliza la rama y el PR de la tarea. Abre el PR
  con el commit documental. Registra el enlace y la etapa `ENGINEERING`
  en el TASK y actualiza la misma rama. Resume el veredicto, las decisiones
  y el enlace. Invoca `delivery-build TASK-<slug>` y continúa.
- `TRIVIAL_FIX`: documenta el criterio de aceptación y su verificación.
  Pasa directamente a `delivery-build`, que gestiona la rama y el PR.
- `BLOCKED`: conserva el TASK con las preguntas abiertas y espera antes
  de abrir el PR o invocar `delivery-build`.

## 7. Retomar desde build o publish

Lee el hallazgo y corrige desde la primera etapa afectada. Reutiliza el
mismo TASK, rama y PR. Versiona el plan en el mismo archivo y registra por
separado los cambios de Implementation Plan y Specification. Cualquier
cambio de Specification requiere aprobación explícita. Conserva los ADR
y DDR anteriores y enlázalos a la decisión que los reemplaza.