# REV-2026-11-24-pw-001-estructura-configuracion-01

- TASK: [TASK-pw-001-estructura-configuracion](../tasks/TASK-pw-001-estructura-configuracion.md)
- Commit revisado: 2060f0b
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Abierto, permitido por el gate (Aceptado como Low: mostrar el error en pantalla en una tarea de cliente posterior.)
- Criterio / plan vigente: AC-3 · PLAN-2026-11-24-pw-001-estructura-configuracion v1
- Etapa responsable: ENGINEERING (tarea futura)

## Comportamiento esperado
Un valor inválido de `VITE_SERVER_URL` hace fallar con un mensaje claro.

## Comportamiento observado
`getServerUrl` se llama en el inicializador de `useState` de `App`; un valor inválido lanza durante el render y, sin *error boundary*, la página queda en blanco con el mensaje solo en la consola. Las pruebas cubren la función, no el render.

## Evidencia
`client/src/App.tsx:13`, `client/src/config.ts` (lectura del código; no ejecutado).
