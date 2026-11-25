# WSBoard (Port Webhook)

Pizarra colaborativa en tiempo real con chat y presencia. Una sala pública única,
usuarios identificados por alias y estado solo en memoria.

Estado actual: acceso por alias único (PW-002). Al abrir la página se pide un nombre;
el servidor lo valida y lo reserva (sin distinguir mayúsculas) y lo libera al salir o al
expirar la sesión (30 s tras perder la conexión). La sala es provisional: la pizarra, el
chat y la lista de participantes llegan en tareas posteriores.

## Requisitos

- Node.js **22.9 o superior** (`--env-file-if-exists`) y npm 10 o superior.

## Instalación

```bash
npm install
```

## Ejecución en local

```bash
npm run dev
```

Arranca el servidor (`http://localhost:3001`) y el cliente (`http://localhost:5173`).
Abre el cliente, elige un nombre y pulsa **Entrar**; abre otra pestaña (o ventana
privada) para probar un alias repetido. Una pestaña recargada conserva su alias.
Comprobación del servidor: `http://localhost:3001/health` responde `{"status":"ok"}`.

Por separado: `npm run dev -w @pw/server` y `npm run dev -w @pw/client`.

## Variables de entorno

Todas son opcionales. Copia el ejemplo que necesites a `.env` en el mismo directorio
(`.env` no se versiona):

| Archivo | Variable | Por defecto | Descripción |
|---|---|---|---|
| `server/.env.example` | `PORT` | `3001` | Puerto del servidor (1–65535). Un valor inválido o un puerto ocupado detiene el arranque con un mensaje. |
| `server/.env.example` | `ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes de navegador permitidos, separados por comas. Un `Origin` no listado se rechaza; las peticiones sin `Origin` (herramientas, pruebas) se aceptan. |
| `client/.env.example` | `VITE_SERVER_URL` | `http://localhost:3001` | URL del servidor WebSocket. |

## Scripts (desde la raíz)

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor y cliente en modo desarrollo |
| `npm run build` | Compila el cliente (`client/dist`) tras comprobar tipos |
| `npm run lint` | ESLint en todo el repositorio |
| `npm run typecheck` | `tsc` en cada workspace |
| `npm test` | Vitest en cada workspace |
| `npm run test:e2e` | Playwright con dos contextos de navegador (ver abajo) |

## Pruebas E2E

`npm run test:e2e` arranca servidor y cliente en los puertos 3101 y 5273 (no choca con
`npm run dev`) y ejecuta `e2e/*.spec.ts`. Requiere un navegador: `npx playwright install chromium`
o, para usar el Chrome instalado, `PW_CHANNEL=chrome npm run test:e2e` (PowerShell:
`$env:PW_CHANNEL="chrome"; npm run test:e2e`).

## Estructura

- `shared/`: contrato (tipos, límites, esquemas zod, coordenadas).
- `server/`: Node.js + Socket.IO (solo `websocket`).
- `client/`: React 18 + TypeScript + Vite.
- `docs/`: ADR, DDR, planes, tareas y revisiones (`docs/adr/` tiene las decisiones vigentes).
