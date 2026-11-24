---
name: delivery-publish
description: >-
  Tercera etapa de entrega de Port Webhook. Revisa de forma independiente
  el código y las pruebas del TASK contra la Specification, el plan y
  las decisiones de diseño y arquitectura. Ejecuta las verificaciones
  aplicables y emite PASS o FAIL con evidencia. Con PASS, deja el PR único
  listo para revisión humana. Con FAIL, devuelve el TASK a delivery-build
  o delivery-start según la causa. Se invoca tras delivery-build o con
  /delivery-publish TASK-<slug>.
argument-hint: "TASK-<slug>"
---

# Delivery Publish

Etapas `REVIEW` y `PUBLISH` del flujo
`delivery-start → delivery-build → delivery-publish`.

Lee `CLAUDE.md` y las plantillas en
`.claude/skills/delivery-start/references/plantillas.md`.
Esta etapa revisa, registra los hallazgos y actualiza el PR existente.
El equipo corrige el código y las pruebas en la etapa correspondiente.

## 1. Verificar la entrada

Lee `docs/tasks/TASK-<slug>.md`. Exige etapa `REVIEW`, o `PUBLISH` si se
repite una publicación. Confirma que la rama, el PR y el TASK coinciden.
Obtén la rama base del PR y registra el commit revisado. Si hay cambios
locales ajenos al TASK, presérvalos y revisa el estado del PR por separado.

## 2. Ejecutar la revisión independiente

Usa un subagente con contexto limpio. Dale el TASK, la Specification y el
plan vigentes, los ADR y DDR aplicables, las reglas del repositorio y el
diff contra la base real del PR. Para `TRIVIAL_FIX`, usa la investigación,
el criterio de aceptación y su verificación. Pide evidencia de comandos,
hallazgos y veredicto. El subagente revisa sin editar código ni pruebas.

Si no hay subagentes disponibles, revisa desde esos artefactos y registra
que el aislamiento fue procedimental.

### Verificación funcional y técnica

- Ejecuta las pruebas unitarias y de integración aplicables. Ejecuta
  Playwright cuando lo exija el plan. Usa los comandos configurados para
  test, lint, comprobación de tipos, build y controles de seguridad.
- Registra por verificación el comando, su resultado y la evidencia
  relevante. Distingue `PASS`, `FAIL`, `NO EJECUTADA` y `NO APLICA`.
  Una verificación exigida por el plan sigue siendo aplicable si falta
  la herramienta necesaria para ejecutarla.
- Para cambios de WebSocket, revisa los eventos y payloads afectados,
  su validación en el servidor y las reglas de sesión, estado y difusión
  definidas en el contrato.
- Para flujos críticos de colaboración, ejecuta los casos E2E previstos
  con dos contextos independientes de navegador. Comprueba qué observa
  cada participante. Si el cambio afecta la entrada tardía o la
  reconexión, verifica la combinación de estado inicial y eventos en vivo
  según los criterios del TASK.

### Conformidad con la Specification y el plan

Verifica cada criterio de aceptación, invariante y caso límite aplicable.
Usa sus IDs o cita el texto breve del criterio. Revisa el alcance, las
pruebas planificadas, los ADR y DDR y las desviaciones documentadas.
Para un plan `COMPACTO`, aplica los requisitos de ese modo. Si aparece una
condición que exige `COMPLETO`, registra un hallazgo `PLAN`.

### Revisión visual

Si cambia la UI, compara el resultado con el DDR y
`docs/design/design-system.md` cuando exista. Revisa los estados visibles,
la accesibilidad básica y la reutilización de componentes y tokens.
Comprueba la vista en escritorio y móvil cuando el cambio afecte el
layout. Adjunta evidencia y registra cualquier revisión pendiente.

## 3. Clasificar los hallazgos y emitir un veredicto

Asigna una categoría a cada hallazgo:

- `IMPLEMENTATION` → `ENGINEERING` → `delivery-build`.
- `SPECIFICATION` o `PLAN` → `PLANNING` → `delivery-start`.
- `ARCHITECTURE` → `ARCHITECTURE` → `delivery-start`.
- `DESIGN` → `DESIGN` → `delivery-start`.

Crea `docs/reviews/REV-<fecha>-<task-slug>-<seq>.md` por cada hallazgo.
Incluye severidad (`Critical`, `High`, `Medium` o `Low`), categoría,
referencia al criterio y al plan vigente, comportamiento esperado y
observado, evidencia y etapa responsable. Usa `N/A` donde corresponda,
por ejemplo en la referencia al plan de un `TRIVIAL_FIX`.

Emite `FAIL` si hay un hallazgo `Critical` o `High` abierto, una prueba
fallida sin excepción explícita del usuario o una verificación aplicable
sin ejecutar. Registra cualquier excepción autorizada en `## Review`.
Emite `PASS` cuando se cumplan las verificaciones requeridas y queden
documentados los hallazgos pendientes permitidos por el gate.

## 4. Registrar el resultado y actuar

Actualiza `## Testing` y `## Review` del PR con la evidencia, el veredicto
y los enlaces a los hallazgos. Registra el resultado y la transición en
el TASK y conserva las demás secciones del PR.

Con `FAIL`:

- Devuelve los defectos de implementación a `delivery-build`.
- Si hay un problema en la especificación, el plan, el diseño o la
  arquitectura, devuelve el TASK a `delivery-start` en la primera etapa
  afectada. Un cambio de Specification requiere aprobación explícita.
- Si falta un requisito del entorno para ejecutar el gate, registra el
  bloqueo y espera a que se resuelva.
- Si es el tercer `FAIL` consecutivo o reaparece el mismo hallazgo,
  detén las invocaciones automáticas y presenta el estado al usuario.

Con `PASS`:

1. Comprueba que el diff final corresponde al TASK y está libre de
   archivos temporales, logs de debug, artefactos de build y posibles
   secretos. Si detectas un posible secreto, detén la publicación y
   avisa al usuario omitiendo el valor de la credencial.
2. Si cambió el código, las pruebas o la configuración desde el commit
   revisado, repite las verificaciones antes de marcar el PR como listo.
3. Completa el resumen, enlaces al TASK y al plan, decisiones de
   arquitectura y diseño, evidencia y limitaciones. Conserva
   `## Changes`, que pertenece a `delivery-build`.
4. Actualiza `## Publicación`, el historial y la etapa `PUBLISH`.
   Sube la documentación de revisión a la rama del PR existente.
5. Deja el PR listo para aprobación humana. El merge es manual.

## 5. Reportar

Resume el veredicto, las verificaciones ejecutadas y pendientes, los
hallazgos, el estado de la revisión visual cuando aplique y el enlace
al PR. Señala cualquier cambio sensible que deba revisar quien apruebe.