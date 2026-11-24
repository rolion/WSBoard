import { describe, expect, expectTypeOf, it } from "vitest";
import {
  CLIENT_EVENT_SCHEMAS as s,
  SERVER_EVENTS,
  backingSize,
  toLogical,
  fitCanvas,
  aliasSchema,
} from "../src";
import type { ClientAcks, ServerEventName, ServerEventPayloads } from "../src";

const v4 = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const start = { id: v4, tool: "pen", color: "#aabbcc", width: 0.01, points: [[0.1, 0.2]] };
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

// REV-02: tipos de payload S→C y acks cubren exactamente los eventos del contrato.
describe("tipos del contrato (REV-02)", () => {
  it("ServerEventPayloads tiene una entrada por cada evento S→C", () => {
    expectTypeOf<keyof ServerEventPayloads>().toEqualTypeOf<ServerEventName>();
    expect(SERVER_EVENTS).toHaveLength(8);
  });
  it("ClientAcks cubre los eventos con acknowledgement", () => {
    expectTypeOf<keyof ClientAcks>().toEqualTypeOf<"session:join" | "session:resume" | "chat:send">();
  });
  it("un ack de error y uno de éxito son asignables", () => {
    const okAck: ClientAcks["chat:send"] = { ok: true };
    const errAck: ClientAcks["session:join"] = { ok: false, error: { code: "ALIAS_TAKEN", message: "x" } };
    expect(okAck.ok && !errAck.ok).toBe(true);
  });
});

// REV-08
describe("StrokeId uuid v4 (REV-08)", () => {
  it("rechaza UUID nil y de otras versiones", () => {
    expect(ok(s["stroke:end"], { id: v4 })).toBe(true);
    expect(ok(s["stroke:end"], { id: "00000000-0000-0000-0000-000000000000" })).toBe(false);
    expect(ok(s["stroke:end"], { id: "3f1c2d4e-5a6b-1c7d-8e9f-0a1b2c3d4e5f" })).toBe(false);
  });
});

// REV-09
describe("chat: separadores de línea (REV-09)", () => {
  it.each(["\u0085", " ", " ", "\r"])("rechaza %j", (c) => {
    expect(ok(s["chat:send"], { text: `a${c}b` })).toBe(false);
  });
  it("500 caracteres con 5 saltos es válido; con 6 no", () => {
    // Texto de exactamente 500 caracteres incluyendo los saltos.
    const withNewlines = (n: number) => "x" + "\n".repeat(n) + "x".repeat(500 - n - 1);
    expect(withNewlines(5)).toHaveLength(500);
    expect(ok(s["chat:send"], { text: withNewlines(5) })).toBe(true);
    expect(ok(s["chat:send"], { text: withNewlines(6) })).toBe(false);
  });
});

// REV-10
describe("coords y alias (REV-10)", () => {
  it("toLogical nunca devuelve NaN", () => {
    const r = fitCanvas(800, 450);
    expect(toLogical(NaN, NaN, r)).toEqual([0, 0]);
    expect(toLogical(Infinity, -Infinity, r)).toEqual([0, 0]);
  });
  it("acepta marcas combinantes (hindi, tailandés) pero no marcas solas", () => {
    expect(aliasSchema.safeParse("हिंदी").success).toBe(true);
    expect(aliasSchema.safeParse("ไทย").success).toBe(true);
    expect(aliasSchema.safeParse("́́").success).toBe(false);
  });
  it("extremos `.` y `-` y repeticiones siguen siendo válidos", () => {
    for (const a of [".a", "a-", "--", "..", "-x-"]) {
      // "--" y ".." no contienen letra ni dígito: se rechazan.
      expect(aliasSchema.safeParse(a).success).toBe(/[\p{L}\p{N}]/u.test(a));
    }
  });
});

// Cobertura planificada por el revisor
describe("límites inclusivos y campos desconocidos", () => {
  it("ancho 0.001 y 0.05 son válidos", () => {
    expect(ok(s["stroke:start"], { ...start, width: 0.001 })).toBe(true);
    expect(ok(s["stroke:start"], { ...start, width: 0.05 })).toBe(true);
  });
  it("punto con 1 o 3 elementos se rechaza", () => {
    expect(ok(s["stroke:start"], { ...start, points: [[0.1]] })).toBe(false);
    expect(ok(s["stroke:start"], { ...start, points: [[0.1, 0.2, 0.3]] })).toBe(false);
  });
  it("descarta campos desconocidos en todos los eventos", () => {
    expect(s["session:join"].parse({ alias: "Ana", protocol: 1, x: 1 })).not.toHaveProperty("x");
    expect(s["session:resume"].parse({ sessionToken: "t", x: 1 })).not.toHaveProperty("x");
    expect(s["stroke:points"].parse({ id: v4, points: [[0, 0]], x: 1 })).not.toHaveProperty("x");
    expect(s["stroke:end"].parse({ id: v4, x: 1 })).not.toHaveProperty("x");
    expect(s["chat:send"].parse({ text: "hola", x: 1 })).not.toHaveProperty("x");
  });
  it("dpr fraccionario redondea el búfer", () => {
    expect(backingSize(801, 451, 1.5)).toEqual({ width: 1202, height: 677 });
  });
});
