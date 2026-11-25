import { afterEach, describe, expect, it, vi } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import { MAX_PARTICIPANTS, PROTOCOL_VERSION, type JoinAck, type ResumeAck } from "@pw/shared";
import { createAppServer, type AppServer } from "../src/app";

const servers: AppServer[] = [];
const sockets: Socket[] = [];

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.close());
  await Promise.all(servers.splice(0).map((s) => s.close()));
});

async function start(options: { reconnectGraceMs?: number } = {}) {
  const app = createAppServer({ allowedOrigins: ["http://localhost:5173"] }, options);
  servers.push(app);
  const port = await app.listen(0);
  return { app, url: `http://127.0.0.1:${port}` };
}

interface Seen {
  event: string;
  payload: unknown;
}
type TestSocket = Socket & { seen: Seen[] };

async function client(url: string): Promise<TestSocket> {
  const socket = connect(url, { transports: ["websocket"], reconnection: false }) as TestSocket;
  socket.seen = [];
  socket.onAny((event, payload) => socket.seen.push({ event, payload }));
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return socket;
}

const join = (s: Socket, alias: unknown, protocol: unknown = PROTOCOL_VERSION): Promise<JoinAck> =>
  s.emitWithAck("session:join", { alias, protocol });
const resume = (s: Socket, sessionToken: unknown): Promise<ResumeAck> =>
  s.emitWithAck("session:resume", { sessionToken });

async function okJoin(s: Socket, alias: string) {
  const ack = await join(s, alias);
  if (!ack.ok) throw new Error(`join falló: ${ack.error.code}`);
  return ack;
}

const presence = (s: TestSocket) => s.seen.filter((e) => e.event.startsWith("presence:"));
const errorOf = (ack: JoinAck | ResumeAck) => (ack.ok ? undefined : ack.error.code);

describe("session:join (AC-1, AC-2)", () => {
  it("un alias libre ingresa: ack con token y snapshot con el participante propio", async () => {
    const { app, url } = await start();
    const a = await client(url);
    const ack = await okJoin(a, "  Ada  ");
    expect(ack.sessionToken).toMatch(/^[0-9a-f]{32}$/);
    expect(ack.snapshot).toMatchObject({
      protocol: PROTOCOL_VERSION,
      epoch: app.room.epoch,
      seq: 1,
      strokes: [],
      chat: [],
    });
    expect(ack.snapshot.participants).toEqual([{ id: ack.snapshot.selfId, alias: "Ada", status: "connected" }]);
  });

  it("rechaza alias inválido, repetido, protocolo distinto y payload mal formado; el socket puede reintentar", async () => {
    const { app, url } = await start();
    const a = await client(url);
    await okJoin(a, "Ada");
    const b = await client(url);

    expect(errorOf(await join(b, ""))).toBe("ALIAS_INVALID");
    expect(errorOf(await join(b, "x"))).toBe("ALIAS_INVALID");
    expect(errorOf(await join(b, "a".repeat(21)))).toBe("ALIAS_INVALID");
    expect(errorOf(await join(b, "<b>"))).toBe("ALIAS_INVALID");
    expect(errorOf(await join(b, 5))).toBe("ALIAS_INVALID");
    expect(errorOf(await join(b, "ADA"))).toBe("ALIAS_TAKEN");
    expect(errorOf(await join(b, "Ａob", 2))).toBe("PROTOCOL_MISMATCH");
    expect(errorOf(await b.emitWithAck("session:join", null))).toBe("PAYLOAD_INVALID");
    expect(app.room.size).toBe(1);

    // Mismo socket, otro alias: ingresa.
    expect((await join(b, "Bob")).ok).toBe(true);
    expect(app.room.size).toBe(2);
  });

  it("un segundo join del mismo socket da ALREADY_JOINED", async () => {
    const { app, url } = await start();
    const a = await client(url);
    await okJoin(a, "Ada");
    expect(errorOf(await join(a, "Otro"))).toBe("ALREADY_JOINED");
    expect(app.room.size).toBe(1);
  });

  it("sin ack no se crea participante y llega error PAYLOAD_INVALID", async () => {
    const { app, url } = await start();
    const a = await client(url);
    a.emit("session:join", { alias: "Ada", protocol: PROTOCOL_VERSION });
    await vi.waitFor(() => expect(a.seen.some((e) => e.event === "error")).toBe(true));
    expect(a.seen.find((e) => e.event === "error")?.payload).toMatchObject({ code: "PAYLOAD_INVALID" });
    expect(app.room.size).toBe(0);
  });

  it("ROOM_FULL con 30 participantes y entra al liberarse un cupo", async () => {
    const { app, url } = await start();
    const all: TestSocket[] = [];
    for (let i = 0; i < MAX_PARTICIPANTS; i++) {
      const s = await client(url);
      await okJoin(s, `user ${i}`);
      all.push(s);
    }
    const late = await client(url);
    expect(errorOf(await join(late, "tarde"))).toBe("ROOM_FULL");
    all[0]!.emit("session:leave");
    await vi.waitFor(() => expect(app.room.size).toBe(MAX_PARTICIPANTS - 1));
    expect((await join(late, "tarde")).ok).toBe(true);
  });
});

describe("reserva atómica (AC-3)", () => {
  it("N sockets simultáneos con variantes del mismo alias: uno entra y el resto ALIAS_TAKEN", async () => {
    const { app, url } = await start();
    const variants = ["Zoe", "zoe", "ZOE", "zOe", "Ｚoe", "Zoe ", " zoe", "ZoE", "zOE", "ｚｏｅ"];
    const socks = await Promise.all(variants.map(() => client(url)));
    const acks = await Promise.all(socks.map((s, i) => join(s, variants[i])));
    expect(acks.filter((a) => a.ok)).toHaveLength(1);
    expect(acks.filter((a) => errorOf(a) === "ALIAS_TAKEN")).toHaveLength(variants.length - 1);
    expect(app.room.size).toBe(1);
  });
});

describe("liberación del alias (AC-4)", () => {
  it("session:leave libera el alias, difunde presence:left y cierra el socket", async () => {
    const { url } = await start();
    const a = await client(url);
    const b = await client(url);
    const ja = await okJoin(a, "Ada");
    await okJoin(b, "Bob");
    const closed = new Promise((r) => a.once("disconnect", r));
    a.emit("session:leave");
    await closed;
    await vi.waitFor(() =>
      expect(presence(b).at(-1)).toMatchObject({
        event: "presence:left",
        payload: { participantId: ja.snapshot.selfId, reason: "leave" },
      }),
    );
    const c = await client(url);
    expect((await join(c, "ada")).ok).toBe(true);
  });

  it("la caída mantiene el alias durante la gracia y lo libera al vencer", async () => {
    const { app, url } = await start({ reconnectGraceMs: 150 });
    const a = await client(url);
    const b = await client(url);
    const ja = await okJoin(a, "Ada");
    await okJoin(b, "Bob");
    a.disconnect();
    await vi.waitFor(() =>
      expect(presence(b).at(-1)).toMatchObject({
        event: "presence:status",
        payload: { participantId: ja.snapshot.selfId, status: "reconnecting" },
      }),
    );
    const c = await client(url);
    expect(errorOf(await join(c, "ADA"))).toBe("ALIAS_TAKEN");
    await vi.waitFor(() =>
      expect(presence(b).at(-1)).toMatchObject({
        event: "presence:left",
        payload: { participantId: ja.snapshot.selfId, reason: "timeout" },
      }),
    );
    expect(app.room.size).toBe(1);
    expect((await join(c, "ADA")).ok).toBe(true);
  });

  it("un socket que cae antes de unirse no crea participante ni difunde", async () => {
    const { app, url } = await start();
    const b = await client(url);
    await okJoin(b, "Bob");
    const ghost = await client(url);
    ghost.disconnect();
    const c = await client(url);
    await okJoin(c, "Cid");
    expect(app.room.size).toBe(2);
    expect(presence(b).map((e) => e.event)).toEqual(["presence:joined"]);
  });

  it("un servidor nuevo (reinicio) tiene otro epoch y no conoce el alias anterior", async () => {
    const first = await start();
    const a = await client(first.url);
    await okJoin(a, "Ada");
    const second = await start();
    expect(second.app.room.epoch).not.toBe(first.app.room.epoch);
    const b = await client(second.url);
    expect((await join(b, "Ada")).ok).toBe(true);
  });
});

describe("NOT_JOINED (AC-5)", () => {
  it("antes de unirse, eventos conocidos dan NOT_JOINED y desconocidos PAYLOAD_INVALID, sin cambiar estado", async () => {
    const { app, url } = await start();
    const observer = await client(url);
    await okJoin(observer, "Obs");
    const s = await client(url);

    for (const event of ["stroke:start", "stroke:points", "stroke:end", "session:leave"]) {
      s.emit(event, {});
    }
    s.emit("chat:send", { text: "hola" });
    s.emit("evento:inventado", {});
    await vi.waitFor(() => expect(s.seen.filter((e) => e.event === "error")).toHaveLength(6));
    const codes = s.seen.map((e) => (e.payload as { code: string }).code);
    expect(codes).toEqual(["NOT_JOINED", "NOT_JOINED", "NOT_JOINED", "NOT_JOINED", "NOT_JOINED", "PAYLOAD_INVALID"]);
    expect(app.room.size).toBe(1);
    expect(s.connected).toBe(true);
    // El observador no recibió nada de esto.
    expect(observer.seen).toEqual([]);
  });

  it("un evento con ack antes de unirse responde por el ack, no por el evento error", async () => {
    const { url } = await start();
    const s = await client(url);
    const ack = await s.emitWithAck("chat:send", { text: "hola" });
    expect(ack).toMatchObject({ ok: false, error: { code: "NOT_JOINED" } });
    expect(s.seen.filter((e) => e.event === "error")).toHaveLength(0);
  });

  it("tras unirse, los eventos aún sin manejador (PW-004) se ignoran sin error ni cambio de estado", async () => {
    const { app, url } = await start();
    const s = await client(url);
    await okJoin(s, "Ada");
    s.emit("stroke:start", {});
    s.emit("chat:send", { text: "hola" }, () => undefined);
    const probe = await client(url);
    await okJoin(probe, "Probe");
    expect(s.seen.filter((e) => e.event === "error")).toHaveLength(0);
    expect(app.room.size).toBe(2);
  });
});

describe("session:resume (AC-6)", () => {
  it("dentro de la gracia conserva el alias y difunde presence:status connected", async () => {
    const { url } = await start();
    const a = await client(url);
    const b = await client(url);
    const ja = await okJoin(a, "Ada");
    await okJoin(b, "Bob");
    a.disconnect();
    await vi.waitFor(() => expect(presence(b).at(-1)?.payload).toMatchObject({ status: "reconnecting" }));

    const a2 = await client(url);
    const ack = await resume(a2, ja.sessionToken);
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    expect(ack.snapshot.selfId).toBe(ja.snapshot.selfId);
    expect(ack.snapshot.participants.map((p) => [p.alias, p.status])).toEqual([
      ["Ada", "connected"],
      ["Bob", "connected"],
    ]);
    await vi.waitFor(() =>
      expect(presence(b).at(-1)).toMatchObject({
        event: "presence:status",
        payload: { participantId: ja.snapshot.selfId, status: "connected" },
      }),
    );
    expect(errorOf(await join(await client(url), "ada"))).toBe("ALIAS_TAKEN");
  });

  it("un token desconocido da SESSION_EXPIRED y un payload inválido PAYLOAD_INVALID", async () => {
    const { url } = await start();
    const s = await client(url);
    expect(errorOf(await resume(s, "no-existe"))).toBe("SESSION_EXPIRED");
    expect(errorOf(await resume(s, 42))).toBe("PAYLOAD_INVALID");
    expect(errorOf(await s.emitWithAck("session:resume", null))).toBe("PAYLOAD_INVALID");
  });

  it("tras vencer la gracia el token da SESSION_EXPIRED", async () => {
    const { app, url } = await start({ reconnectGraceMs: 30 });
    const a = await client(url);
    const ja = await okJoin(a, "Ada");
    a.disconnect();
    await vi.waitFor(() => expect(app.room.size).toBe(0));
    expect(errorOf(await resume(await client(url), ja.sessionToken))).toBe("SESSION_EXPIRED");
  });

  it("el token de otro epoch (reinicio) da SESSION_EXPIRED", async () => {
    const first = await start();
    const a = await client(first.url);
    const ja = await okJoin(a, "Ada");
    const second = await start();
    expect(errorOf(await resume(await client(second.url), ja.sessionToken))).toBe("SESSION_EXPIRED");
  });

  it("con el token activo en otro socket, cierra el anterior sin cambiar la presencia", async () => {
    const { app, url } = await start({ reconnectGraceMs: 60 });
    const a = await client(url);
    const b = await client(url);
    const ja = await okJoin(a, "Ada");
    await okJoin(b, "Bob");
    const closed = new Promise((r) => a.once("disconnect", r));
    const a2 = await client(url);
    expect((await resume(a2, ja.sessionToken)).ok).toBe(true);
    await closed;
    // Sentinela: un join posterior llega a `b` después de cualquier evento espurio.
    await okJoin(await client(url), "Cid");
    await vi.waitFor(() => expect(presence(b).map((e) => e.event)).toEqual(["presence:joined"]));
    // Pasada la gracia el alias sigue vivo porque el nuevo socket es el vigente.
    await new Promise((r) => setTimeout(r, 120));
    expect(app.room.size).toBe(3);
  });

  it("un socket ya unido que intenta resume recibe ALREADY_JOINED", async () => {
    const { url } = await start();
    const a = await client(url);
    const ja = await okJoin(a, "Ada");
    expect(errorOf(await resume(a, ja.sessionToken))).toBe("ALREADY_JOINED");
  });
});

describe("presencia con seq (AC-7)", () => {
  it("seq contiguo; snapshot.seq incluye el join propio; el nuevo no recibe su propio presence:joined", async () => {
    const { url } = await start();
    const a = await client(url);
    const b = await client(url);
    const ja = await okJoin(a, "Ada");
    const jb = await okJoin(b, "Bob");
    expect(ja.snapshot.seq).toBe(1);
    expect(jb.snapshot.seq).toBe(2);
    expect(jb.snapshot.participants.map((p) => p.alias)).toEqual(["Ada", "Bob"]);

    await vi.waitFor(() => expect(presence(a)).toHaveLength(1));
    expect(presence(a)[0]).toMatchObject({
      event: "presence:joined",
      payload: { seq: 2, participant: { alias: "Bob", status: "connected" } },
    });

    b.disconnect();
    await vi.waitFor(() => expect(presence(a)).toHaveLength(2));
    const seqs = presence(a).map((e) => (e.payload as { seq: number }).seq);
    expect(seqs).toEqual([2, 3]);
    expect(presence(b)).toEqual([]);
  });
});
