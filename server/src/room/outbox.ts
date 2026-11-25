import type { ServerEventName, ServerEventPayloads } from "@pw/shared";

/** Identificador opaco de una conexión (en producción, `socket.id`). */
export type ConnectionId = string;

/** Salida de la sala hacia el transporte: la sala no conoce Socket.IO. */
export interface Outbox {
  send<E extends ServerEventName>(conn: ConnectionId, event: E, payload: ServerEventPayloads[E]): void;
  /** Cierra la conexión (p. ej. el socket sustituido por un `session:resume`). */
  disconnect(conn: ConnectionId): void;
}
