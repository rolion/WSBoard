export const DEFAULT_SERVER_URL = "http://localhost:3001";

export function getServerUrl(env: { VITE_SERVER_URL?: string }): string {
  const raw = env.VITE_SERVER_URL?.trim();
  if (!raw) return DEFAULT_SERVER_URL;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`VITE_SERVER_URL inválida: "${raw}". Usa una URL como ${DEFAULT_SERVER_URL}.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`VITE_SERVER_URL debe usar http o https: "${raw}".`);
  }
  return raw.replace(/\/+$/, "");
}
