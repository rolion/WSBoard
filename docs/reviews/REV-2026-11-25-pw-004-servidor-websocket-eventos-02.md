# REV-2026-11-25-pw-004-servidor-websocket-eventos-02

- Severidad: Medium
- Categoría: IMPLEMENTATION
- Criterio: AC-7 / A2
- Plan vigente: [PLAN-2026-11-25-pw-004-servidor-websocket-eventos](../plans/PLAN-2026-11-25-pw-004-servidor-websocket-eventos.md) v1
- Commit revisado: `b339bc4` (revisor independiente, subagente de contexto limpio sin edición)
- Etapa responsable: ENGINEERING (`delivery-build`): probar el caso numérico, probar y documentar el cierre del socket para `null`/objeto
- Estado: Resuelto (verificado en la revisión 2, commit `b59cec4`)

## Esperado

Un nombre de evento que no es cadena devuelve `PAYLOAD_INVALID`, sin cambiar estado ni consumir `seq`, y hay prueba en `protocol.errors.test.ts`.

## Observado

No hay prueba con nombre no cadena. Un nombre numérico responde `PAYLOAD_INVALID`; un nombre `null` u objeto lo rechaza el parser de Socket.IO y cierra el socket (el participante pasa a `reconnecting`). Ese comportamiento del transporte no está documentado.

## Evidencia

`server/test/protocol.errors.test.ts:38-49`; `server/src/transport.ts:54-58`.
