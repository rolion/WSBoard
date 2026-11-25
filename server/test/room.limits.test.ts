import { describe, expect, it } from "vitest";
import { RATE_STROKE_EVENTS } from "@pw/shared";
import { joined, makeRoom, pts, strokeStart } from "./helpers";

describe("Room: límites y cierre forzado (A1, A4)", () => {
  it("MAX_STROKES: BOARD_FULL en stroke:start y no se crea el trazo", () => {
    const { room, out } = makeRoom({ limits: { maxStrokes: 2 } });
    joined(room, "a", "Ana");
    for (let i = 0; i < 2; i++) {
      const s = strokeStart();
      room.strokeStart("a", s);
      room.strokeEnd("a", { id: s.id });
    }
    const before = out.sent.length;
    expect(room.strokeStart("a", strokeStart())).toMatchObject({ ok: false, code: "BOARD_FULL" });
    expect(out.sent.length).toBe(before);
    expect(joined(room, "b", "Beto").snapshot.strokes).toHaveLength(2);
  });

  it("MAX_TOTAL_POINTS en start: BOARD_FULL sin crear el trazo", () => {
    const { room } = makeRoom({ limits: { maxTotalPoints: 5 } });
    joined(room, "a", "Ana");
    expect(room.strokeStart("a", strokeStart(6))).toMatchObject({ code: "BOARD_FULL" });
    expect(room.strokeStart("a", strokeStart(5))).toEqual({ ok: true });
  });

  it("MAX_TOTAL_POINTS en points: rechaza el lote entero, cierra el trazo y difunde stroke:ended", () => {
    const { room, out } = makeRoom({ limits: { maxTotalPoints: 10 } });
    joined(room, "a", "Ana");
    joined(room, "b", "Beto");
    const s = strokeStart(8);
    room.strokeStart("a", s);
    expect(room.strokePoints("a", { id: s.id, points: pts(3) })).toMatchObject({ code: "BOARD_FULL" });
    const ended = out.to("b", "stroke:ended");
    expect(ended).toHaveLength(1);
    expect(out.to("a", "seq:advance").at(-1)!.payload.seq).toBe(ended[0]!.payload.seq);
    const snap = joined(room, "c", "Carla").snapshot;
    expect(snap.strokes[0]).toMatchObject({ open: false });
    expect(snap.strokes[0]!.points).toHaveLength(8); // puntos aceptados hasta ese momento
    expect(room.strokeStart("a", strokeStart(1))).toEqual({ ok: true }); // el autor puede abrir otro
  });

  it("exceso de puntos por trazo: STROKE_INVALID y cierre; el límite exacto se acepta", () => {
    const { room, out } = makeRoom({ limits: { maxPointsPerStroke: 10 } });
    joined(room, "a", "Ana");
    joined(room, "b", "Beto");
    const s = strokeStart(8);
    room.strokeStart("a", s);
    expect(room.strokePoints("a", { id: s.id, points: pts(2) })).toEqual({ ok: true });
    expect(room.strokePoints("a", { id: s.id, points: pts(1) })).toMatchObject({ code: "STROKE_INVALID" });
    expect(out.to("b", "stroke:ended")).toHaveLength(1);
    expect(room.strokePoints("a", { id: s.id, points: pts(1) })).toMatchObject({ code: "STROKE_INVALID" });
    expect(out.to("b", "stroke:ended")).toHaveLength(1);
  });

  it("tasa de trazos: 60 por segundo y por conexión", () => {
    let t = 0;
    const { room } = makeRoom({ now: () => t });
    joined(room, "a", "Ana");
    const r = Array.from({ length: RATE_STROKE_EVENTS + 1 }, () => room.allow("a", "stroke"));
    expect(r.filter(Boolean)).toHaveLength(RATE_STROKE_EVENTS);
    expect(room.allow("b", "stroke")).toBe(true); // otra conexión, otro contador
    t = 1000;
    expect(room.allow("a", "stroke")).toBe(true);
  });
});
