import { PROTOCOL_VERSION, type ErrorCode, type JoinAck, type ResumeAck, type Snapshot } from "@pw/shared";
import type { EntryError } from "./alias-messages";
import type { SocketLike } from "./connection";

export const TOKEN_KEY = "pw.sessionToken";
export const DEFAULT_ACK_TIMEOUT_MS = 5000;

/** Subconjunto de `Storage`; puede faltar o lanzar (modo privado, datos bloqueados). */
export interface TokenStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SessionState {
  screen: "entry" | "room";
  /** Estado del enlace con el servidor. En la sala, distinto de `connected` = reconectando. */
  link: "connecting" | "connected" | "offline";
  submitting: boolean;
  error?: EntryError;
  /** Aviso informativo sobre la entrada tras perder la sesión. */
  notice?: "session-expired";
  alias?: string;
  selfId?: string;
}

export interface SessionController {
  getState(): SessionState;
  subscribe(listener: () => void): () => void;
  /** Alias tal como lo escribe el usuario; el servidor lo normaliza y valida. */
  join(alias: string): void;
  leave(): void;
  /** Pide una nueva conexión inmediata (botón "Reintentar conexión"). */
  retry(): void;
  /** Registra listeners y conecta. Idempotente; reiniciable tras `detach()` (StrictMode). */
  attach(): void;
  /** Quita listeners y cierra el socket sin tocar el token. */
  detach(): void;
}

export interface SessionOptions {
  store?: TokenStore | null;
  ackTimeoutMs?: number;
}

const INITIAL: SessionState = { screen: "entry", link: "connecting", submitting: false };

export function createSessionController(socket: SocketLike, options: SessionOptions = {}): SessionController {
  const store = options.store ?? null;
  const ackTimeoutMs = options.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS;

  let state: SessionState = INITIAL;
  const listeners = new Set<() => void>();
  let attached = false;

  const set = (patch: Partial<SessionState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  const readToken = (): string | null => {
    try {
      return store?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  };
  const writeToken = (token: string) => {
    try {
      store?.setItem(TOKEN_KEY, token);
    } catch {
      // Sin almacenamiento la app funciona, solo que no reanuda al recargar.
    }
  };
  const clearToken = () => {
    try {
      store?.removeItem(TOKEN_KEY);
    } catch {
      // ver writeToken
    }
  };

  const aliasOf = (snapshot: Snapshot) => snapshot.participants.find((p) => p.id === snapshot.selfId)?.alias;

  const expire = () => {
    clearToken();
    set({ screen: "entry", link: "connected", submitting: false, error: undefined, notice: "session-expired", alias: undefined, selfId: undefined });
  };

  const resume = (token: string) => {
    socket.timeout(ackTimeoutMs).emit("session:resume", { sessionToken: token }, (err: unknown, ack: ResumeAck) => {
      if (!attached) return;
      if (err) {
        // Sin respuesta: se conserva el token y se deja que la reconexión automática reintente.
        set({ link: "connecting" });
        socket.disconnect();
        socket.connect();
        return;
      }
      if (ack.ok) {
        set({ screen: "room", link: "connected", selfId: ack.snapshot.selfId, alias: aliasOf(ack.snapshot) });
        return;
      }
      if (ack.error.code === "SESSION_EXPIRED") {
        expire();
        return;
      }
      // Otro rechazo (p. ej. ALREADY_JOINED): no se puede reanudar; se vuelve a la entrada.
      clearToken();
      set({ screen: "entry", link: "connected", submitting: false, error: ack.error.code, alias: undefined, selfId: undefined });
    });
  };

  const onConnect = () => {
    const token = readToken();
    if (token) {
      resume(token);
      return;
    }
    set({ link: "connected" });
  };

  const onConnectError = () => {
    if (state.screen === "entry") set({ link: "offline", submitting: false });
  };

  const onDisconnect = (reason: unknown) => {
    if (reason === "io client disconnect") return;
    if (state.screen === "room") {
      // El servidor cerró el socket (token reutilizado en otra pestaña): la sesión ya no es nuestra.
      // Socket.IO no reconecta tras `io server disconnect`: se abre un socket nuevo para poder volver a entrar.
      if (reason === "io server disconnect") {
        expire();
        set({ link: "connecting" });
        socket.connect();
      } else set({ link: "connecting" });
      return;
    }
    set({ link: "connecting", ...(state.submitting ? { submitting: false, error: "OFFLINE" as const } : {}) });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    join(alias) {
      if (state.screen !== "entry" || state.submitting || state.link !== "connected") return;
      set({ submitting: true, error: undefined, notice: undefined });
      socket.timeout(ackTimeoutMs).emit("session:join", { alias, protocol: PROTOCOL_VERSION }, (err: unknown, ack: JoinAck) => {
        // Un ack tardío de un envío ya cancelado (se cayó el socket) no debe cambiar de pantalla.
        if (!attached || state.screen !== "entry" || !state.submitting) return;
        if (err) {
          set({ submitting: false, error: "TIMEOUT" });
          return;
        }
        if (ack.ok) {
          writeToken(ack.sessionToken);
          set({ screen: "room", submitting: false, error: undefined, selfId: ack.snapshot.selfId, alias: aliasOf(ack.snapshot) });
          return;
        }
        set({ submitting: false, error: ack.error.code as ErrorCode });
      });
    },
    leave() {
      if (state.screen !== "room") return;
      socket.emit("session:leave");
      clearToken();
      // El servidor cierra el socket al salir: se abre uno nuevo para volver a entrar.
      socket.disconnect();
      set({ screen: "entry", link: "connecting", submitting: false, error: undefined, notice: undefined, alias: undefined, selfId: undefined });
      socket.connect();
    },
    retry() {
      if (state.link === "offline") set({ link: "connecting" });
      socket.connect();
    },
    attach() {
      if (attached) return;
      attached = true;
      socket.on("connect", onConnect);
      socket.on("connect_error", onConnectError);
      socket.on("disconnect", onDisconnect);
      socket.connect();
    },
    detach() {
      if (!attached) return;
      attached = false;
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
      state = INITIAL;
    },
  };
}
