import { createAppServer } from "./app";
import { loadConfig } from "./config";

try {
  const config = loadConfig(process.env);
  const app = createAppServer(config);
  const port = await app.listen(config.port);
  console.log(`[server] escuchando en http://localhost:${port} (orígenes: ${config.allowedOrigins.join(", ")})`);
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;
  console.error(
    code === "EADDRINUSE"
      ? "[server] El puerto está en uso. Cambia PORT o libera el puerto."
      : `[server] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
