export interface ServerConfig {
  port: number;
  allowedOrigins: string[];
}

export const DEFAULT_PORT = 3001;
export const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173"];

export function loadConfig(env: Record<string, string | undefined>): ServerConfig {
  const rawPort = env.PORT?.trim();
  let port = DEFAULT_PORT;
  if (rawPort) {
    port = Number(rawPort);
    if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) {
      throw new Error(`PORT inválido: "${rawPort}". Debe ser un entero entre 1 y 65535.`);
    }
  }

  const rawOrigins = env.ALLOWED_ORIGINS;
  const parsed =
    rawOrigins === undefined
      ? DEFAULT_ALLOWED_ORIGINS
      : [...new Set(rawOrigins.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean))];
  if (parsed.length === 0) {
    throw new Error("ALLOWED_ORIGINS está vacío. Indica al menos un origen, p. ej. http://localhost:5173.");
  }
  return { port, allowedOrigins: parsed };
}
