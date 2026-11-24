import { describe, expect, it, vi } from "vitest";
import { createConnectionController, type SocketLike } from "../src/connection";

function fakeSocket() {
  const handlers = new Map<string, Set<(...a: unknown[]) => void>>();
  const socket = {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn((e: string, l: (...a: unknown[]) => void) => {
      (handlers.get(e) ?? handlers.set(e, new Set()).get(e)!).add(l);
    }),
    off: vi.fn((e: string, l: (...a: unknown[]) => void) => handlers.get(e)?.delete(l)),
  } satisfies SocketLike;
  const emit = (e: string) => handlers.get(e)?.forEach((l) => l());
  const count = () => [...handlers.values()].reduce((n, s) => n + s.size, 0);
  return { socket, emit, count };
}

describe("createConnectionController", () => {
  it("transita disconnected → connecting → connected → disconnected", () => {
    const { socket, emit } = fakeSocket();
    const c = createConnectionController(socket);
    c.attach();
    const seen: string[] = [];
    c.subscribe((s) => seen.push(s));
    c.connect();
    emit("connect");
    c.disconnect();
    expect(seen).toEqual(["connecting", "connected", "disconnected"]);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("conectar dos veces abre una sola conexión", () => {
    const { socket } = fakeSocket();
    const c = createConnectionController(socket);
    c.attach();
    c.connect();
    c.connect();
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it("desconectar mientras conecta cierra el socket", () => {
    const { socket } = fakeSocket();
    const c = createConnectionController(socket);
    c.attach();
    c.connect();
    c.disconnect();
    expect(c.getStatus()).toBe("disconnected");
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("un error de conexión pasa a error y permite reintentar", () => {
    const { socket, emit } = fakeSocket();
    const c = createConnectionController(socket);
    c.attach();
    c.connect();
    emit("connect_error");
    expect(c.getStatus()).toBe("error");
    c.connect();
    expect(c.getStatus()).toBe("connecting");
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });

  it("un cierre del servidor pasa a disconnected", () => {
    const { socket, emit } = fakeSocket();
    const c = createConnectionController(socket);
    c.attach();
    c.connect();
    emit("connect");
    emit("disconnect");
    expect(c.getStatus()).toBe("disconnected");
  });

  it("detach quita listeners, cierra el socket y deja de notificar al socket", () => {
    const { socket, emit, count } = fakeSocket();
    const c = createConnectionController(socket);
    c.attach();
    c.attach();
    expect(count()).toBe(3);
    c.connect();
    c.detach();
    expect(count()).toBe(0);
    expect(socket.disconnect).toHaveBeenCalled();
    emit("connect");
    expect(c.getStatus()).toBe("disconnected");
  });

  it("sobrevive al ciclo attach/detach/attach de StrictMode", () => {
    const { socket, emit, count } = fakeSocket();
    const c = createConnectionController(socket);
    const seen: string[] = [];
    c.subscribe((s) => seen.push(s));
    c.attach();
    c.detach();
    c.attach();
    expect(count()).toBe(3);
    c.connect();
    emit("connect");
    expect(c.getStatus()).toBe("connected");
    expect(seen).toEqual(["connecting", "connected"]);
  });
});
