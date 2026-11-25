import type { ErrorCode } from "@pw/shared";

/** Errores que la pantalla de entrada sabe explicar (códigos del servidor + fallos locales). */
export type EntryError = ErrorCode | "TIMEOUT" | "OFFLINE";

const MESSAGES: Partial<Record<EntryError, string>> = {
  ALIAS_INVALID: "Ese nombre no es válido. Usa entre 2 y 20 caracteres: letras, números, espacios, _ - .",
  ALIAS_TAKEN: "Ese nombre ya está en uso. Elige otro.",
  ROOM_FULL: "La sala está llena (30 de 30). Inténtalo de nuevo en unos minutos.",
  PROTOCOL_MISMATCH: "Tu versión de la aplicación no es compatible. Recarga la página.",
  TIMEOUT: "El servidor no respondió. Inténtalo de nuevo.",
  OFFLINE: "No se pudo conectar con el servidor.",
};

const GENERIC = "No se pudo entrar. Inténtalo de nuevo.";

/** El `message` del servidor es solo diagnóstico: al usuario se le muestra este texto. */
export function entryErrorMessage(error: EntryError): string {
  return MESSAGES[error] ?? GENERIC;
}

export const SESSION_EXPIRED_NOTICE =
  "Tu sesión expiró o la sala se reinició. Elige un nombre para volver a entrar. " +
  "Si la sala se reinició, el dibujo y el chat anteriores se perdieron.";

export const CONNECTING_MESSAGE = "Conectando con el servidor…";
export const RECONNECTING_MESSAGE = "Reconectando…";
