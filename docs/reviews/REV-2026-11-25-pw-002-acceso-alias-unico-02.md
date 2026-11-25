# REV-2026-11-25-pw-002-acceso-alias-unico-02 — Parpadeo de la entrada durante el resume inicial

- Severidad: Low
- Categoría: DESIGN
- Criterio: AC-8; DDR PW-002, "Flujo" paso 1 ("no se muestra la entrada salvo que falle")
- Plan vigente: PLAN-2026-11-25-pw-002-acceso-alias-unico v1, paso 8
- Commit revisado: `da407b1`
- Etapa responsable: DESIGN / ENGINEERING (no bloqueante)

**Esperado.** Con token guardado no se muestra la entrada mientras se reanuda.

**Observado.** Se renderiza la entrada deshabilitada con "Conectando con el servidor…" hasta el ack del `resume`.
No hay un estado "reanudando" separado.

**Evidencia.** `client/src/App.tsx:30-33`, `client/src/session.ts:46,90-99`. Cosmético; sin impacto funcional.
Se mantiene abierto: el texto del DDR admite "Conectando" como estado de la entrada.
