# REV-2026-11-25-pw-002-acceso-alias-unico-01 — Tras `io server disconnect` la pestaña queda sin socket

- Severidad: Medium
- Categoría: IMPLEMENTATION
- Criterio: AC-9 (vuelta a la entrada con aviso) y AC-8 (reintento sin recargar); caso AC-6 (token activo en otra pestaña)
- Plan vigente: [PLAN-2026-11-25-pw-002-acceso-alias-unico](../plans/PLAN-2026-11-25-pw-002-acceso-alias-unico.md) v1, paso 6
- Commit revisado: `da407b1`
- Estado: Cerrado (verificado en `3f05ff6`)
- Etapa responsable: ENGINEERING → `delivery-build`

**Esperado.** Si el servidor cierra el socket de una pestaña en la sala (otro socket reanudó su token),
el cliente vuelve a la entrada con el aviso y puede entrar de nuevo sin recargar.

**Observado.** `expire()` deja `link: "connected"` pero nadie reconecta: Socket.IO no reconecta tras
`io server disconnect`. El formulario queda habilitado con el socket caído; el `join` da `TIMEOUT` a los 5 s
y no hay botón de reintento. Solo recargar lo arregla.

**Evidencia.** `client/src/session.ts:127-133` (rama `io server disconnect` → `expire()`), `:84-87`.
Reproducido por el revisor con servidor y `socket.io-client` reales: estado
`{screen:"entry", link:"connected", notice:"session-expired"}` con `socket.connected === false`; `join("Bea")` → `TIMEOUT`.
`client/test/session.test.ts:181-189` no comprueba la reconexión, por eso no lo detectaba.

**Arreglo propuesto.** En esa rama, pasar a `link: "connecting"` y llamar a `socket.connect()`; añadir la aserción.
