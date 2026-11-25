# REV-2026-11-25-pw-002-acceso-alias-unico-03 — E2E sin foco tras error ni roles alert/status

- Severidad: Low
- Categoría: IMPLEMENTATION (pruebas)
- Criterio: AC-8 (Test Specification: "foco y rol `alert`/`status`")
- Plan vigente: PLAN-2026-11-25-pw-002-acceso-alias-unico v1, paso 9
- Commit revisado: `da407b1`
- Etapa responsable: ENGINEERING → `delivery-build`

**Esperado.** Los E2E comprueban el foco del campo tras un error y los roles ARIA `alert`/`status`.

**Observado.** Solo `toBeFocused` en E2E-6 y `aria-invalid`; los roles se afirman por `data-testid`.

**Evidencia.** `e2e/alias.spec.ts:26-33,44-64`.
