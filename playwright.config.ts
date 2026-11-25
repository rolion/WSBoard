import { defineConfig } from "@playwright/test";

// Puertos propios de los E2E: no chocan con `npm run dev` (3001 / 5173) ni reutilizan
// un servidor que no arrancó Playwright con la configuración esperada.
const SERVER_PORT = 3101;
const CLIENT_PORT = 5273;
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;

// `PW_CHANNEL=chrome` usa el Chrome instalado (evita descargar el Chromium de Playwright).
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: CLIENT_URL,
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start -w @pw/server",
      url: `http://localhost:${SERVER_PORT}/health`,
      env: { PORT: String(SERVER_PORT), ALLOWED_ORIGINS: CLIENT_URL },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run dev -w @pw/client -- --port ${CLIENT_PORT} --strictPort`,
      url: CLIENT_URL,
      env: { VITE_SERVER_URL: `http://localhost:${SERVER_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
