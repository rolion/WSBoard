import { describe, expect, it, vi } from "vitest";
import type { ErrorCode, JoinAck, ResumeAck, Snapshot } from "@pw/shared";
import type { SocketLike } from "../src/connection";
import { TOKEN_KEY, createSessionController, type TokenStore } from "../src/session";

type Cb = (err: unknown, ack: unknown) => void;

function fakeSocket() {
  const handlers = new Map<string, Set<(...a: unknown[]) => void>>();
  const emitted: { event: string; payload: unknown; cb?: Cb }[] = [];
  const plain: string[] = [];
  const socket = {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn((event: string) => void plain.push(event)),
    timeout: vi.fn(() => ({
      emit: (event: string, payload: unknown, cb: Cb) => void emitted.push({ event, payload, cb }),
    })),
    on: vi.fn((e: string, l: (...a: unknown[]) => void) => {
      (handlers.get(e) ?? handlers.set(e, new Set()).get(e)!).add(l);
    }),
    off: vi.fn((e: string, l: (...a: unknown[]) => void) => handlers.get(e)?.delete(l)),
  } satisfies SocketLike;
  const fire = (e: string, ...args: unknown[]) => handlers.get(e)?.forEach((l) => l(...args));
  const listeners = () => [...handlers.values()].reduce((n, s) => n + s.size, 0);
  return { socket, fire, emitted, plain, listeners };
}

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const store: TokenStore = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
  return { store, data };
}

const snapshot = (alias = "Ada"): Snapshot => ({
  protocol: 1,
  epoch: "e",
  seq: 1,
  selfId: "me",
  participants: [{ id: "me", alias, status: "connected" }],
  strokes: [],
  chat: [],
});
const joinOk = (alias = "Ada"): JoinAck => ({ ok: true, sessionToken: "tok", snapshot: snapshot(alias) });
const fail = (code: ErrorCode) => ({ ok: false as const, error: { code, message: "diag" } });

function setup(initial: Record<string, string> = {}, store: TokenStore | null | "mem" = "mem") {
  const f = fakeSocket();
  const mem = memoryStore(initial);
  const c = createSessionController(f.socket, { store: store === "mem" ? mem.store : store, ackTimeoutMs: 1000 });
  c.attach();
  return { ...f, c, mem };
}

describe("estado inicial y conexión", () => {
  it("al montar conecta y muestra la entrada en 'conectando' hasta conectar", () => {
    const { c, socket, fire } = setup();
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(c.getState()).toMatchObject({ screen: "entry", link: "connecting", submitting: false });
    fire("connect");
    expect(c.getState()).toMatchObject({ screen: "entry", link: "connected" });
  });

  it("un error de conexión en la entrada pasa a offline y retry vuelve a conectar", () => {
    const { c, socket, fire } = setup();
    fire("connect_error");
    expect(c.getState().link).toBe("offline");
    c.retry();
    expect(c.getState().link).toBe("connecting");
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });

  it("no se puede enviar join hasta estar conectado", () => {
    const { c, emitted } = setup();
    c.join("Ada");
    expect(emitted).toHaveLength(0);
  });
});

describe("join", () => {
  it("un alias libre entra, guarda el token y muestra la sala con el alias del servidor", () => {
    const { c, fire, emitted, mem } = setup();
    fire("connect");
    c.join("  ada ");
    expect(emitted[0]).toMatchObject({ event: "session:join", payload: { alias: "  ada ", protocol: 1 } });
    expect(c.getState().submitting).toBe(true);
    emitted[0]!.cb!(null, joinOk("ada"));
    expect(c.getState()).toMatchObject({ screen: "room", submitting: false, alias: "ada", selfId: "me" });
    expect(mem.data.get(TOKEN_KEY)).toBe("tok");
  });

  it("alias tomado o inválido muestra el error y permite reintentar sin recargar", () => {
    const { c, fire, emitted, mem } = setup();
    fire("connect");
    c.join("Ada");
    emitted[0]!.cb!(null, fail("ALIAS_TAKEN"));
    expect(c.getState()).toMatchObject({ screen: "entry", submitting: false, error: "ALIAS_TAKEN" });
    expect(mem.data.size).toBe(0);
    c.join("Bob");
    expect(c.getState().error).toBeUndefined();
    emitted[1]!.cb!(null, joinOk("Bob"));
    expect(c.getState().screen).toBe("room");
  });

  it("un doble envío deja un solo join en vuelo", () => {
    const { c, fire, emitted } = setup();
    fire("connect");
    c.join("Ada");
    c.join("Ada");
    expect(emitted).toHaveLength(1);
  });

  it("si el ack no llega, error TIMEOUT y se puede reintentar", () => {
    const { c, fire, emitted } = setup();
    fire("connect");
    c.join("Ada");
    emitted[0]!.cb!(new Error("timeout"), undefined);
    expect(c.getState()).toMatchObject({ submitting: false, error: "TIMEOUT" });
    c.join("Ada");
    expect(emitted).toHaveLength(2);
  });

  it("si se cae el socket mientras se envía, error OFFLINE", () => {
    const { c, fire, emitted } = setup();
    fire("connect");
    c.join("Ada");
    fire("disconnect", "transport close");
    expect(c.getState()).toMatchObject({ submitting: false, error: "OFFLINE", link: "connecting" });
    emitted[0]!.cb!(null, joinOk());
    expect(c.getState().screen).toBe("entry");
  });

  it("limpia el aviso de sesión expirada al enviar", () => {
    const { c, fire, emitted } = setup({ [TOKEN_KEY]: "viejo" });
    fire("connect");
    emitted[0]!.cb!(null, fail("SESSION_EXPIRED"));
    expect(c.getState().notice).toBe("session-expired");
    c.join("Ada");
    expect(c.getState().notice).toBeUndefined();
  });
});

describe("reanudación (resume)", () => {
  it("con token guardado, al conectar reanuda sin mostrar la entrada habilitada", () => {
    const { c, fire, emitted } = setup({ [TOKEN_KEY]: "tok" });
    fire("connect");
    expect(emitted[0]).toMatchObject({ event: "session:resume", payload: { sessionToken: "tok" } });
    expect(c.getState()).toMatchObject({ screen: "entry", link: "connecting" });
    emitted[0]!.cb!(null, { ok: true, snapshot: snapshot() } satisfies ResumeAck);
    expect(c.getState()).toMatchObject({ screen: "room", link: "connected", alias: "Ada" });
  });

  it("SESSION_EXPIRED borra el token y vuelve a la entrada con aviso", () => {
    const { c, fire, emitted, mem } = setup({ [TOKEN_KEY]: "tok" });
    fire("connect");
    emitted[0]!.cb!(null, fail("SESSION_EXPIRED"));
    expect(c.getState()).toMatchObject({ screen: "entry", link: "connected", notice: "session-expired" });
    expect(mem.data.size).toBe(0);
  });

  it("una caída en la sala muestra reconectando y al volver reanuda con el mismo token", () => {
    const { c, fire, emitted } = setup();
    fire("connect");
    c.join("Ada");
    emitted[0]!.cb!(null, joinOk());
    fire("disconnect", "transport close");
    expect(c.getState()).toMatchObject({ screen: "room", link: "connecting" });
    fire("connect_error");
    expect(c.getState()).toMatchObject({ screen: "room", link: "connecting" });
    fire("connect");
    expect(emitted[1]).toMatchObject({ event: "session:resume", payload: { sessionToken: "tok" } });
    emitted[1]!.cb!(null, { ok: true, snapshot: snapshot() });
    expect(c.getState()).toMatchObject({ screen: "room", link: "connected" });
  });

  it("si el servidor cierra el socket estando en la sala (token en otra pestaña), vuelve a la entrada", () => {
    const { c, fire, emitted, mem, socket } = setup();
    fire("connect");
    c.join("Ada");
    emitted[0]!.cb!(null, joinOk());
    fire("disconnect", "io server disconnect");
    expect(c.getState()).toMatchObject({ screen: "entry", notice: "session-expired", link: "connecting" });
    expect(mem.data.size).toBe(0);
    // REV-01: Socket.IO no reconecta solo tras `io server disconnect`.
    expect(socket.connect).toHaveBeenCalledTimes(2);
    fire("connect");
    expect(c.getState()).toMatchObject({ screen: "entry", link: "connected", notice: "session-expired" });
    c.join("Bea");
    expect(emitted).toHaveLength(2);
  });

  it("un resume sin respuesta conserva el token y reintenta la conexión", () => {
    const { c, fire, emitted, socket, mem } = setup({ [TOKEN_KEY]: "tok" });
    fire("connect");
    emitted[0]!.cb!(new Error("timeout"), undefined);
    expect(mem.data.get(TOKEN_KEY)).toBe("tok");
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(c.getState().link).toBe("connecting");
  });

  it("otro rechazo del resume (ALREADY_JOINED) borra el token y muestra la entrada con error", () => {
    const { c, fire, emitted, mem } = setup({ [TOKEN_KEY]: "tok" });
    fire("connect");
    emitted[0]!.cb!(null, fail("ALREADY_JOINED"));
    expect(c.getState()).toMatchObject({ screen: "entry", link: "connected", error: "ALREADY_JOINED" });
    expect(mem.data.size).toBe(0);
  });
});

describe("salir", () => {
  it("leave avisa al servidor, borra el token, cierra y reabre el socket y vuelve a la entrada sin aviso", () => {
    const { c, fire, emitted, plain, socket, mem } = setup();
    fire("connect");
    c.join("Ada");
    emitted[0]!.cb!(null, joinOk());
    c.leave();
    expect(plain).toEqual(["session:leave"]);
    expect(mem.data.size).toBe(0);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(2);
    expect(c.getState()).toMatchObject({ screen: "entry", link: "connecting", alias: undefined });
    expect(c.getState().notice).toBeUndefined();
    // El cierre manual no cuenta como caída.
    fire("disconnect", "io client disconnect");
    expect(c.getState().screen).toBe("entry");
  });

  it("leave fuera de la sala no hace nada", () => {
    const { c, plain } = setup();
    c.leave();
    expect(plain).toEqual([]);
  });
});

describe("almacenamiento y ciclo de vida", () => {
  it("sin sessionStorage o con acceso que lanza, funciona sin reanudar", () => {
    const throwing: TokenStore = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    for (const store of [null, throwing]) {
      const { c, fire, emitted } = setup({}, store);
      fire("connect");
      expect(c.getState().link).toBe("connected");
      c.join("Ada");
      emitted[0]!.cb!(null, joinOk());
      expect(c.getState().screen).toBe("room");
      c.leave();
      expect(c.getState().screen).toBe("entry");
    }
  });

  it("attach/detach/attach no duplica listeners ni conexiones activas (StrictMode)", () => {
    const { c, socket, listeners } = setup();
    c.attach();
    expect(listeners()).toBe(3);
    c.detach();
    expect(listeners()).toBe(0);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    c.attach();
    expect(listeners()).toBe(3);
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });

  it("detach conserva el token para reanudar al volver", () => {
    const { c, fire, emitted, mem } = setup();
    fire("connect");
    c.join("Ada");
    emitted[0]!.cb!(null, joinOk());
    c.detach();
    expect(mem.data.get(TOKEN_KEY)).toBe("tok");
  });

  it("notifica a los suscriptores y permite darse de baja", () => {
    const { c, fire } = setup();
    const seen = vi.fn();
    const off = c.subscribe(seen);
    fire("connect");
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    fire("connect_error");
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
