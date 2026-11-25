import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECONNECT_GRACE_MS } from "@pw/shared";
import { join, joined, makeRoom, strokeStart } from "./helpers";

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

describe("Room: ingreso", () => {
  it("join devuelve token y snapshot con seq que incluye presence:joined", () => {
    const { room, out } = makeRoom();
    const a = joined(room, "a", "Ana");
    expect(a.snapshot.seq).toBe(1);
    expect(a.snapshot.participants).toEqual([{ id: a.id, alias: "Ana", status: "connected" }]);
    expect(a.snapshot.epoch).toBe(room.epoch);
    expect(a.token.length).toBeGreaterThanOrEqual(16);
    expect(out.to("a")).toHaveLength(0); // el nuevo no recibe su propio presence:joined

    const b = joined(room, "b", "Beto");
    expect(b.snapshot.seq).toBe(2);
    const seen = out.to("a", "presence:joined");
    expect(seen).toHaveLength(1);
    expect(seen[0]!.payload).toMatchObject({ seq: 2, participant: { id: b.id, alias: "Beto" } });
    expect(JSON.stringify(out.sent)).not.toContain(b.token);
  });

  it("alias único sin distinguir mayúsculas ni normalización NFKC", () => {
    const { room } = makeRoom();
    joined(room, "a", "Ana");
    expect(room.join("b", join("ANA"))).toMatchObject({ ok: false, code: "ALIAS_TAKEN" });
    joined(room, "c", "Ｂeto"); // NFKC: "Beto" (la validación de esquema la hace el transporte)
    expect(room.join("d", join("beto"))).toMatchObject({ ok: false, code: "ALIAS_TAKEN" });
  });

  it("ROOM_FULL con 30 participantes, contando los que están en gracia", () => {
    const { room } = makeRoom();
    for (let i = 0; i < 30; i++) joined(room, `c${i}`, `User ${i}`);
    room.disconnect("c0");
    expect(room.join("x", join("Otro"))).toMatchObject({ ok: false, code: "ROOM_FULL" });
  });

  it("ALREADY_JOINED en un socket ya unido", () => {
    const { room } = makeRoom();
    joined(room, "a", "Ana");
    expect(room.join("a", join("Otra"))).toMatchObject({ ok: false, code: "ALREADY_JOINED" });
    expect(room.isJoined("a")).toBe(true);
    expect(room.isJoined("zzz")).toBe(false);
  });

  it("un fallo no consume seq", () => {
    const { room } = makeRoom();
    joined(room, "a", "Ana");
    room.join("b", join("Ana"));
    expect(joined(room, "c", "Carla").snapshot.seq).toBe(2);
  });
});

describe("Room: desconexión, gracia y reanudación", () => {
  it("desconectar -> reconnecting; resume dentro de la gracia -> connected con snapshot completo", () => {
    const { room, out } = makeRoom();
    joined(room, "a", "Ana");
    const b = joined(room, "b", "Beto");
    room.disconnect("b");
    expect(out.to("a", "presence:status").at(-1)!.payload).toMatchObject({ participantId: b.id, status: "reconnecting" });

    vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1);
    const res = room.resume("b2", { sessionToken: b.token });
    expect(res).toMatchObject({ ok: true });
    if (res.ok) {
      expect(res.snapshot.selfId).toBe(b.id);
      expect(res.snapshot.participants.find((p) => p.id === b.id)!.status).toBe("connected");
    }
    expect(out.to("a", "presence:status").at(-1)!.payload).toMatchObject({ status: "connected" });
    vi.advanceTimersByTime(RECONNECT_GRACE_MS * 2);
    expect(out.to("a", "presence:left")).toHaveLength(0);
  });

  it("vencida la gracia: cierra el trazo abierto, presence:left timeout y libera el alias", () => {
    const { room, out } = makeRoom();
    joined(room, "a", "Ana");
    const b = joined(room, "b", "Beto");
    const s = strokeStart();
    room.strokeStart("b", s);
    room.disconnect("b");
    vi.advanceTimersByTime(RECONNECT_GRACE_MS - 1);
    expect(out.to("a", "stroke:ended")).toHaveLength(0); // sigue abierto durante la gracia
    vi.advanceTimersByTime(1);
    const ended = out.to("a", "stroke:ended");
    const left = out.to("a", "presence:left");
    expect(ended[0]!.payload).toMatchObject({ id: s.id });
    expect(left[0]!.payload).toMatchObject({ participantId: b.id, reason: "timeout" });
    expect(left[0]!.payload.seq).toBe(ended[0]!.payload.seq + 1);
    expect(room.resume("b2", { sessionToken: b.token })).toMatchObject({ ok: false, code: "SESSION_EXPIRED" });
    expect(room.join("b3", join("Beto"))).toMatchObject({ ok: true });
  });

  it("resume desde otro socket sustituye al anterior sin cambiar la presencia", () => {
    const { room, out } = makeRoom();
    joined(room, "a", "Ana");
    const b = joined(room, "b", "Beto");
    const before = out.sent.length;
    expect(room.resume("b2", { sessionToken: b.token })).toMatchObject({ ok: true });
    expect(out.disconnected).toEqual(["b"]);
    expect(out.sent.length).toBe(before); // nada difundido
    room.disconnect("b"); // el cierre tardío del socket viejo no afecta al participante vigente
    expect(room.isJoined("b2")).toBe(true);
    vi.advanceTimersByTime(RECONNECT_GRACE_MS * 2);
    expect(out.to("a", "presence:left")).toHaveLength(0);
  });

  it("resume con token desconocido o con el socket ya unido", () => {
    const { room } = makeRoom();
    const a = joined(room, "a", "Ana");
    expect(room.resume("x", { sessionToken: "nope" })).toMatchObject({ ok: false, code: "SESSION_EXPIRED" });
    expect(room.resume("a", { sessionToken: a.token })).toMatchObject({ ok: false, code: "ALREADY_JOINED" });
  });

  it("otra sala (otro epoch) no reconoce tokens", () => {
    const one = makeRoom().room;
    const two = makeRoom().room;
    const a = joined(one, "a", "Ana");
    expect(two.epoch).not.toBe(one.epoch);
    expect(two.resume("x", { sessionToken: a.token })).toMatchObject({ ok: false, code: "SESSION_EXPIRED" });
  });

  it("leave libera el alias al instante, cierra el trazo y difunde presence:left leave", () => {
    const { room, out } = makeRoom();
    joined(room, "a", "Ana");
    const b = joined(room, "b", "Beto");
    room.strokeStart("b", strokeStart());
    room.leave("b");
    expect(out.to("a", "stroke:ended")).toHaveLength(1);
    expect(out.to("a", "presence:left").at(-1)!.payload).toMatchObject({ participantId: b.id, reason: "leave" });
    expect(room.join("c", join("Beto"))).toMatchObject({ ok: true });
    expect(room.resume("d", { sessionToken: b.token })).toMatchObject({ ok: false, code: "SESSION_EXPIRED" });
  });

  it("desconectar un socket sin unirse no cambia nada; la sala vacía conserva su estado", () => {
    const { room, out } = makeRoom();
    room.disconnect("fantasma");
    expect(out.sent).toHaveLength(0);
    joined(room, "a", "Ana");
    room.strokeStart("a", strokeStart());
    room.leave("a");
    expect(joined(room, "b", "Beto").snapshot.strokes).toHaveLength(1);
  });

  it("close() cancela los temporizadores de gracia", () => {
    const { room, out } = makeRoom();
    joined(room, "a", "Ana");
    joined(room, "b", "Beto");
    room.disconnect("b");
    room.close();
    vi.advanceTimersByTime(RECONNECT_GRACE_MS * 2);
    expect(out.to("a", "presence:left")).toHaveLength(0);
  });
});
