import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { joined, makeRoom, pts, strokeStart } from "./helpers";

function setup() {
  const { room, out } = makeRoom();
  const a = joined(room, "a", "Ana");
  const b = joined(room, "b", "Beto");
  return { room, out, a, b };
}

describe("Room: trazos", () => {
  it("start/points/end difunden a los demás y el autor recibe seq:advance", () => {
    const { room, out, a } = setup();
    const s = strokeStart(2);
    out.sent.length = 0;
    expect(room.strokeStart("a", s)).toEqual({ ok: true });
    expect(room.strokePoints("a", { id: s.id, points: pts(3, 10) })).toEqual({ ok: true });
    expect(room.strokeEnd("a", { id: s.id })).toEqual({ ok: true });

    const forB = out.to("b");
    expect(forB.map((e) => e.event)).toEqual(["stroke:started", "stroke:appended", "stroke:ended"]);
    expect(forB[0]!.payload).toMatchObject({ stroke: { id: s.id, authorId: a.id, open: true } });
    const forA = out.to("a");
    expect(forA.map((e) => e.event)).toEqual(["seq:advance", "seq:advance", "seq:advance"]);
    expect(forA.map((e) => e.payload.seq)).toEqual(forB.map((e) => e.payload.seq));
  });

  it("el snapshot incluye trazos abiertos con sus puntos actuales", () => {
    const { room } = setup();
    const s = strokeStart(2);
    room.strokeStart("a", s);
    room.strokePoints("a", { id: s.id, points: pts(3, 10) });
    const c = joined(room, "c", "Carla");
    expect(c.snapshot.strokes).toHaveLength(1);
    expect(c.snapshot.strokes[0]).toMatchObject({ id: s.id, open: true });
    expect(c.snapshot.strokes[0]!.points).toHaveLength(5);
  });

  it("STROKE_LIMIT con un trazo abierto; id duplicado es STROKE_INVALID", () => {
    const { room } = setup();
    const s = strokeStart();
    room.strokeStart("a", s);
    expect(room.strokeStart("a", strokeStart())).toMatchObject({ ok: false, code: "STROKE_LIMIT" });
    room.strokeEnd("a", { id: s.id });
    expect(room.strokeStart("a", s)).toMatchObject({ ok: false, code: "STROKE_INVALID" });
    expect(room.strokeStart("b", s)).toMatchObject({ ok: false, code: "STROKE_INVALID" });
    expect(room.strokeStart("a", strokeStart())).toEqual({ ok: true });
  });

  it("precedencia: repetir el id del trazo abierto propio es STROKE_LIMIT; el de uno cerrado, STROKE_INVALID", () => {
    const { room, out } = setup();
    const s = strokeStart();
    room.strokeStart("a", s);
    const before = out.sent.length;
    expect(room.strokeStart("a", s)).toMatchObject({ code: "STROKE_LIMIT" });
    expect(out.sent.length).toBe(before); // no duplica ni difunde
    room.strokeEnd("a", { id: s.id });
    expect(room.strokeStart("a", s)).toMatchObject({ code: "STROKE_INVALID" });
  });

  it("solo el autor modifica su trazo abierto", () => {
    const { room, out } = setup();
    const s = strokeStart();
    room.strokeStart("a", s);
    const before = out.sent.length;
    expect(room.strokePoints("b", { id: s.id, points: pts(1) })).toMatchObject({ code: "STROKE_INVALID" });
    expect(room.strokeEnd("b", { id: s.id })).toMatchObject({ code: "STROKE_INVALID" });
    expect(room.strokePoints("a", { id: randomUUID(), points: pts(1) })).toMatchObject({ code: "STROKE_INVALID" });
    room.strokeEnd("a", { id: s.id });
    expect(room.strokePoints("a", { id: s.id, points: pts(1) })).toMatchObject({ code: "STROKE_INVALID" });
    expect(room.strokeEnd("a", { id: s.id })).toMatchObject({ code: "STROKE_INVALID" });
    expect(out.sent.length).toBe(before + 2); // solo el stroke:ended legítimo (b + advance para a)
  });

  it("sin unirse: NOT_JOINED y sin efectos", () => {
    const { room, out } = makeRoom();
    expect(room.strokeStart("x", strokeStart())).toMatchObject({ code: "NOT_JOINED" });
    expect(room.strokePoints("x", { id: randomUUID(), points: pts(1) })).toMatchObject({ code: "NOT_JOINED" });
    expect(room.strokeEnd("x", { id: randomUUID() })).toMatchObject({ code: "NOT_JOINED" });
    expect(room.chatSend("x", { text: "hola" })).toMatchObject({ code: "NOT_JOINED" });
    expect(out.sent).toHaveLength(0);
  });
});
