import { describe, expect, it } from "vitest";
import { MAX_PARTICIPANTS, PROTOCOL_VERSION, RECONNECT_GRACE_MS, type ServerEventPayloads } from "@pw/shared";
import { Room, type Clock, type RoomHooks } from "../src/room";

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: Clock = {
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout(handle) {
      timers.delete(handle as number);
    },
  };
  return {
    clock,
    pending: () => timers.size,
    advance(ms: number) {
      now += ms;
      for (const [id, t] of [...timers]) {
        if (t.at <= now) {
          timers.delete(id);
          t.fn();
        }
      }
    },
  };
}

function setup(options: { reconnectGraceMs?: number } = {}) {
  const sent: { event: string; payload: unknown; except?: string }[] = [];
  const kicked: string[] = [];
  const hooks: RoomHooks = {
    broadcast<E extends keyof ServerEventPayloads>(event: E, payload: ServerEventPayloads[E], except?: string) {
      sent.push({ event, payload, except });
    },
    kick: (id) => kicked.push(id),
  };
  const t = fakeClock();
  const room = new Room(hooks, { clock: t.clock, ...options });
  return { room, sent, kicked, t };
}

const joined = (r: ReturnType<typeof setup>, socket: string, alias: string) => {
  const ack = r.room.join(socket, alias);
  if (!ack.ok) throw new Error(`join falló: ${ack.error.code}`);
  return ack;
};

describe("Room.join", () => {
  it("admite un alias libre y devuelve token y snapshot con el participante propio", () => {
    const r = setup();
    const ack = joined(r, "s1", "Ada");
    expect(ack.sessionToken).toMatch(/^[0-9a-f]{32}$/);
    expect(ack.snapshot).toMatchObject({
      protocol: PROTOCOL_VERSION,
      epoch: r.room.epoch,
      seq: 1,
      strokes: [],
      chat: [],
    });
    expect(ack.snapshot.participants).toEqual([{ id: ack.snapshot.selfId, alias: "Ada", status: "connected" }]);
    expect(r.room.size).toBe(1);
  });

  it("rechaza un alias repetido sin distinguir mayúsculas ni formas NFKC", () => {
    const r = setup();
    joined(r, "s1", "Ada");
    for (const alias of ["ada", "ADA", "Ａｄａ"]) {
      const ack = r.room.join(`x-${alias}`, alias);
      expect(ack).toMatchObject({ ok: false, error: { code: "ALIAS_TAKEN" } });
    }
    expect(r.room.size).toBe(1);
  });

  it("dos join consecutivos del mismo alias: gana el primero", () => {
    const r = setup();
    const results = [r.room.join("a", "Zoe"), r.room.join("b", "zoe")];
    expect(results.map((x) => x.ok)).toEqual([true, false]);
  });

  it("un rechazo no cambia el estado ni consume seq", () => {
    const r = setup();
    joined(r, "s1", "Ada");
    const before = r.sent.length;
    r.room.join("s2", "ADA");
    expect(r.sent).toHaveLength(before);
    expect(joined(r, "s3", "Bob").snapshot.seq).toBe(2);
  });

  it("ALREADY_JOINED en un segundo join del mismo socket, incluso con el mismo alias", () => {
    const r = setup();
    joined(r, "s1", "Ada");
    expect(r.room.join("s1", "Otro")).toMatchObject({ ok: false, error: { code: "ALREADY_JOINED" } });
    expect(r.room.join("s1", "Ada")).toMatchObject({ ok: false, error: { code: "ALREADY_JOINED" } });
    expect(r.room.size).toBe(1);
  });

  it("ROOM_FULL con 30 participantes, incluidos los que están en gracia; entra al liberarse un cupo", () => {
    const r = setup();
    for (let i = 0; i < MAX_PARTICIPANTS; i++) joined(r, `s${i}`, `user ${i}`);
    r.room.disconnect("s0");
    expect(r.room.join("late", "tarde")).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } });
    r.room.leave("s1");
    expect(r.room.join("late", "tarde").ok).toBe(true);
  });

  it("difunde presence:joined a los demás con seq y sin el socket nuevo", () => {
    const r = setup();
    const ack = joined(r, "s1", "Ada");
    expect(r.sent).toEqual([
      {
        event: "presence:joined",
        payload: { seq: 1, participant: { id: ack.snapshot.selfId, alias: "Ada", status: "connected" } },
        except: "s1",
      },
    ]);
  });
});

describe("Room: liberación del alias", () => {
  it("leave libera el alias al instante y difunde presence:left", () => {
    const r = setup();
    const ack = joined(r, "s1", "Ada");
    expect(r.room.leave("s1")).toBe(true);
    expect(r.sent.at(-1)).toMatchObject({
      event: "presence:left",
      payload: { participantId: ack.snapshot.selfId, reason: "leave" },
    });
    expect(r.room.join("s2", "ada").ok).toBe(true);
  });

  it("leave de un socket no unido no hace nada", () => {
    const r = setup();
    expect(r.room.leave("nadie")).toBe(false);
    expect(r.sent).toHaveLength(0);
  });

  it("la caída pasa a reconnecting y mantiene el alias hasta vencer la gracia", () => {
    const r = setup();
    const ack = joined(r, "s1", "Ada");
    r.room.disconnect("s1");
    expect(r.sent.at(-1)).toMatchObject({
      event: "presence:status",
      payload: { participantId: ack.snapshot.selfId, status: "reconnecting" },
    });
    r.t.advance(RECONNECT_GRACE_MS - 1);
    expect(r.room.join("s2", "ADA")).toMatchObject({ ok: false, error: { code: "ALIAS_TAKEN" } });
    r.t.advance(1);
    expect(r.sent.at(-1)).toMatchObject({
      event: "presence:left",
      payload: { participantId: ack.snapshot.selfId, reason: "timeout" },
    });
    expect(r.room.join("s3", "ada").ok).toBe(true);
  });

  it("usa la gracia configurada", () => {
    const r = setup({ reconnectGraceMs: 50 });
    joined(r, "s1", "Ada");
    r.room.disconnect("s1");
    r.t.advance(50);
    expect(r.room.size).toBe(0);
  });

  it("desconectar un socket no unido no crea participante ni difunde", () => {
    const r = setup();
    r.room.disconnect("fantasma");
    expect(r.room.size).toBe(0);
    expect(r.sent).toHaveLength(0);
  });

  it("no hay doble presence:left si sale justo tras vencer la gracia", () => {
    const r = setup();
    joined(r, "s1", "Ada");
    r.room.disconnect("s1");
    r.t.advance(RECONNECT_GRACE_MS);
    expect(r.room.leave("s1")).toBe(false);
    expect(r.sent.filter((s) => s.event === "presence:left")).toHaveLength(1);
  });

  it("dispose cancela los temporizadores pendientes", () => {
    const r = setup();
    joined(r, "s1", "Ada");
    r.room.disconnect("s1");
    expect(r.t.pending()).toBe(1);
    r.room.dispose();
    expect(r.t.pending()).toBe(0);
  });
});

describe("Room.resume", () => {
  it("en gracia conserva el alias, cancela el temporizador y difunde presence:status", () => {
    const r = setup();
    const j = joined(r, "s1", "Ada");
    r.room.disconnect("s1");
    const ack = r.room.resume("s2", j.sessionToken);
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    expect(ack.snapshot.selfId).toBe(j.snapshot.selfId);
    expect(ack.snapshot.participants).toEqual([{ id: j.snapshot.selfId, alias: "Ada", status: "connected" }]);
    expect(ack.snapshot.seq).toBe(3);
    expect(r.sent.at(-1)).toMatchObject({ event: "presence:status", payload: { status: "connected" } });
    expect(r.t.pending()).toBe(0);
    r.t.advance(RECONNECT_GRACE_MS * 2);
    expect(r.room.size).toBe(1);
  });

  it("un token desconocido o vencido da SESSION_EXPIRED", () => {
    const r = setup();
    expect(r.room.resume("s1", "no-existe")).toMatchObject({ ok: false, error: { code: "SESSION_EXPIRED" } });
    const j = joined(r, "s2", "Ada");
    r.room.disconnect("s2");
    r.t.advance(RECONNECT_GRACE_MS);
    expect(r.room.resume("s3", j.sessionToken)).toMatchObject({ ok: false, error: { code: "SESSION_EXPIRED" } });
  });

  it("un token de otro epoch (otra sala) da SESSION_EXPIRED", () => {
    const a = setup();
    const b = setup();
    const j = joined(a, "s1", "Ada");
    expect(b.room.resume("s1", j.sessionToken)).toMatchObject({ ok: false, error: { code: "SESSION_EXPIRED" } });
    expect(a.room.epoch).not.toBe(b.room.epoch);
  });

  it("con el token activo en otro socket, reemplaza al anterior sin tocar la presencia", () => {
    const r = setup();
    const j = joined(r, "s1", "Ada");
    const events = r.sent.length;
    const ack = r.room.resume("s2", j.sessionToken);
    expect(ack.ok).toBe(true);
    expect(r.kicked).toEqual(["s1"]);
    expect(r.sent).toHaveLength(events);
    // La desconexión posterior del socket reemplazado no marca reconnecting ni libera el alias.
    r.room.disconnect("s1");
    expect(r.sent).toHaveLength(events);
    expect(r.t.pending()).toBe(0);
    expect(r.room.isJoined("s2")).toBe(true);
    expect(r.room.isJoined("s1")).toBe(false);
  });

  it("ALREADY_JOINED si el socket ya está unido", () => {
    const r = setup();
    const j = joined(r, "s1", "Ada");
    expect(r.room.resume("s1", j.sessionToken)).toMatchObject({ ok: false, error: { code: "ALREADY_JOINED" } });
  });
});

describe("Room: seq", () => {
  it("es monótono y sin huecos en toda la presencia", () => {
    const r = setup();
    const j = joined(r, "s1", "Ada");
    joined(r, "s2", "Bob");
    r.room.disconnect("s1");
    r.room.resume("s3", j.sessionToken);
    r.room.leave("s2");
    const seqs = r.sent.map((s) => (s.payload as { seq: number }).seq);
    expect(seqs).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("Room.dispose", () => {
  it("tras dispose, una caída no arma temporizadores de gracia", () => {
    const r = setup();
    joined(r, "s1", "Ada");
    r.room.dispose();
    r.room.disconnect("s1");
    expect(r.t.pending()).toBe(0);
  });
});
