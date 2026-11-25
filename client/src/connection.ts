import { io } from "socket.io-client";

/** Subconjunto del socket que usa el controlador de sesión (permite un doble en pruebas). */
export interface SocketLike {
  connected: boolean;
  connect(): unknown;
  disconnect(): unknown;
  emit(event: string, ...args: unknown[]): unknown;
  /** Como `socket.timeout(ms).emit(evento, payload, (err, respuesta) => …)` de Socket.IO. */
  timeout(ms: number): { emit(event: string, ...args: unknown[]): unknown };
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  off(event: string, listener: (...args: unknown[]) => void): unknown;
}

/**
 * Socket único por pestaña. Reconexión automática con espera acotada: la sesión
 * se reanuda con `session:resume` dentro de la gracia del servidor.
 */
export function createSocket(url: string): SocketLike {
  return io(url, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });
}
