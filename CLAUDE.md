# Port Webhook (WSBoard)

Pizarra colaborativa en tiempo real con chat y presencia. Una sala pública
única, usuarios identificados por alias, estado solo en memoria.

## Flujo de entrega

`delivery-start → delivery-build → delivery-publish` (skills en
`.claude/skills/`). Una tarea = un `docs/tasks/TASK-<slug>.md`, una rama
`task/TASK-<slug>` y un solo PR. Plantillas:
`.claude/skills/delivery-start/references/plantillas.md`.

## Stack

React 18 + TypeScript + Vite + Canvas 2D (`client/`), Node.js + Socket.IO
solo `websocket` (`server/`), contrato compartido en `shared/` (tipos, límites,
esquemas zod). Monorepo npm workspaces. Pruebas: Vitest; E2E: Playwright.
Decisiones vigentes: `docs/adr/`, `docs/design/`.

## Comandos

```
npm install
npm test          # Vitest en todos los workspaces
npm run typecheck # tsc en todos los workspaces
```

`lint` aún no existe (deuda técnica: ver TASK-pw-000-definicion-mvp).

## Reglas

- **Servidor autoritativo**: aliases, trazos, chat y `seq` solo los decide el
  servidor. El cliente envía intenciones.
- **Sin persistencia**: nada se escribe a disco ni base de datos. Reiniciar el
  servidor vacía la sala, genera un nuevo `epoch` e invalida las sesiones
  (`SESSION_EXPIRED`); el cliente vuelve a la pantalla de alias con aviso.
- **Nunca imágenes por la red**: solo eventos estructurados de trazos con
  coordenadas normalizadas `[0,1]` sobre un lienzo lógico 16:9.
- **Validación**: todo payload entrante se valida en el servidor con los
  esquemas de `shared/`. Los límites viven solo en `shared/src/limits.ts`.
- **Contrato**: `docs/adr/ADR-pw-000-definicion-mvp-contrato-eventos.md` es la
  fuente; un cambio en eventos, `seq`, sincronización o autoridad del estado
  vuelve a `delivery-start` (nuevo ADR que reemplaza al vigente).
- **Chat**: texto plano; el cliente lo renderiza escapado.
- **Colaboración**: los E2E usan dos contextos de navegador independientes y
  aserciones sobre estado observable, no esperas fijas.
- Dependencias nuevas: pedir confirmación. No versionar `.env` ni secretos.
