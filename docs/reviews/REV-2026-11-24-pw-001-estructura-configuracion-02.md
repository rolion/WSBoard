# REV-2026-11-24-pw-001-estructura-configuracion-02

- TASK: [TASK-pw-001-estructura-configuracion](../tasks/TASK-pw-001-estructura-configuracion.md)
- Commit revisado: 2060f0b
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Abierto, permitido por el gate (Aceptado como Low; se añade una prueba de frontera cuando el servidor procese eventos de dominio.)
- Criterio / plan vigente: AC-5 · PLAN-2026-11-24-pw-001-estructura-configuracion v1
- Etapa responsable: ENGINEERING (tarea futura)

## Comportamiento esperado
Una prueba detecta tanto un cambio del límite como un mensaje justo dentro de él.

## Comportamiento observado
La prueba de mensaje grande usa `MAX_MESSAGE_BYTES + 1` caracteres más la envoltura del paquete, así que cerraría incluso con un límite algo mayor; lo que detecta un cambio es la aserción `opts.maxHttpBufferSize === MAX_MESSAGE_BYTES`. No hay prueba de frontera.

## Evidencia
`server/test/connection.test.ts` (prueba de `maxHttpBufferSize`).
