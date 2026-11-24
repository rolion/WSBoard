import { describe, expect, it } from "vitest";
import * as L from "../src/limits";

// AC-1: valores de la tabla de límites del ADR de contrato.
describe("limits", () => {
  it("coincide con la tabla normativa", () => {
    expect(L.PROTOCOL_VERSION).toBe(1);
    expect(L.ROOM_ID).toBe("main");
    expect(L.MAX_PARTICIPANTS).toBe(30);
    expect([L.ALIAS_MIN, L.ALIAS_MAX]).toEqual([2, 20]);
    expect(L.MAX_MESSAGE_BYTES).toBe(16_384);
    expect(L.MAX_POINTS_PER_BATCH).toBe(64);
    expect(L.MAX_POINTS_PER_STROKE).toBe(5_000);
    expect(L.MAX_STROKES).toBe(5_000);
    expect(L.MAX_TOTAL_POINTS).toBe(500_000);
    expect([L.STROKE_WIDTH_MIN, L.STROKE_WIDTH_MAX]).toEqual([0.001, 0.05]);
    expect(L.MAX_OPEN_STROKES_PER_PARTICIPANT).toBe(1);
    expect(L.CHAT_MAX_CHARS).toBe(500);
    expect(L.CHAT_HISTORY).toBe(200);
    expect(L.RATE_STROKE_EVENTS).toBe(60);
    expect(L.RATE_CHAT).toEqual({ messages: 5, windowMs: 10_000 });
    expect(L.CHAT_MAX_NEWLINES).toBe(5);
    expect(L.LOGICAL_ASPECT).toBeCloseTo(16 / 9, 12);
    expect(L.COORD_DECIMALS).toBe(4);
    expect(L.RECONNECT_GRACE_MS).toBe(30_000);
  });
});
