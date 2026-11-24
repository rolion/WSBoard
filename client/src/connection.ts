import { io } from "socket.io-client";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/** Subconjunto del socket que usa el controlador (permite un doble en pruebas). */
export interface SocketLike {
  connected: boolean;
  connect(): unknown;
  disconnect(): unknown;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  off(event: string, listener: (...args: unknown[]) => void): unknown;
}

export interface ConnectionController {
  getStatus(): ConnectionStatus;
  subscribe(listener: (status: ConnectionStatus) => void): () => void;
  connect(): void;
  disconnect(): void;
  /** Registra los listeners del socket. Idempotente; el propietario lo llama al montar. */
  attach(): void;
  /** Cierra el socket y quita sus listeners. Reiniciable con `attach()` (StrictMode). */
  detach(): void;
}

export function createSocket(url: string): SocketLike {
  return io(url, { transports: ["websocket"], autoConnect: false, reconnection: false });
}

export function createConnectionController(socket: SocketLike): ConnectionController {
  let status: ConnectionStatus = "disconnected";
  const listeners = new Set<(status: ConnectionStatus) => void>();

  const set = (next: ConnectionStatus) => {
    if (next === status) return;
    status = next;
    listeners.forEach((l) => l(next));
  };

  const onConnect = () => set("connected");
  const onConnectError = () => set("error");
  const onDisconnect = () => set("disconnected");
  let attached = false;

  return {
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    connect() {
      if (status === "connecting" || status === "connected") return;
      set("connecting");
      socket.connect();
    },
    disconnect() {
      if (status === "disconnected") return;
      socket.disconnect();
      set("disconnected");
    },
    attach() {
      if (attached) return;
      attached = true;
      socket.on("connect", onConnect);
      socket.on("connect_error", onConnectError);
      socket.on("disconnect", onDisconnect);
    },
    detach() {
      if (!attached) return;
      attached = false;
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
      set("disconnected");
    },
  };
}
