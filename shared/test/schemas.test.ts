import { describe, expect, it } from "vitest";
import { CLIENT_EVENT_SCHEMAS } from "../src/events";

const id = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const pts = (n: number) => Array.from({ length: n }, (_, i) => [i / 100, 0.5] as [number, number]);
const start = { id, tool: "pen", color: "#aabbcc", width: 0.01, points: pts(1) };

const s = CLIENT_EVENT_SCHEMAS;
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

// AC-3
describe("session:join", () => {
  it("acepta el caso válido y valida protocolo y alias", () => {
    expect(ok(s["session:join"], { alias: "Ana", protocol: 1 })).toBe(true);
    expect(ok(s["session:join"], { alias: "Ana", protocol: 2 })).toBe(false);
    expect(ok(s["session:join"], { alias: "a", protocol: 1 })).toBe(false);
  });
  it("devuelve el alias normalizado", () => {
    expect(s["session:join"].parse({ alias: " Ana ", protocol: 1 }).alias).toBe("Ana");
  });
});

describe("session:resume", () => {
  it("valida solo el token (sin lastSeq)", () => {
    expect(ok(s["session:resume"], { sessionToken: "abc" })).toBe(true);
    expect(ok(s["session:resume"], { sessionToken: "" })).toBe(false);
    expect(ok(s["session:resume"], {})).toBe(false);
    expect(s["session:resume"].parse({ sessionToken: "abc", lastSeq: 5 })).not.toHaveProperty("lastSeq");
  });
});

describe("stroke:start", () => {
  it("acepta el caso válido", () => expect(ok(s["stroke:start"], start)).toBe(true));
  it("rechaza lotes fuera de 1–64 puntos", () => {
    expect(ok(s["stroke:start"], { ...start, points: pts(64) })).toBe(true);
    expect(ok(s["stroke:start"], { ...start, points: pts(65) })).toBe(false);
    expect(ok(s["stroke:start"], { ...start, points: [] })).toBe(false);
  });
  it("rechaza color, ancho, herramienta e id inválidos", () => {
    expect(ok(s["stroke:start"], { ...start, color: "red" })).toBe(false);
    expect(ok(s["stroke:start"], { ...start, color: "#abc" })).toBe(false);
    expect(ok(s["stroke:start"], { ...start, width: 0.0001 })).toBe(false);
    expect(ok(s["stroke:start"], { ...start, width: 0.06 })).toBe(false);
    expect(ok(s["stroke:start"], { ...start, tool: "brush" })).toBe(false);
    expect(ok(s["stroke:start"], { ...start, id: "no-uuid" })).toBe(false);
  });
  it("rechaza puntos fuera de [0,1] o no finitos", () => {
    for (const p of [[1.01, 0], [-0.1, 0], [NaN, 0], [Infinity, 0]])
      expect(ok(s["stroke:start"], { ...start, points: [p] })).toBe(false);
  });
  it("redondea a 4 decimales y descarta campos desconocidos", () => {
    const out = s["stroke:start"].parse({ ...start, points: [[0.123456, 0.5]], authorId: "x", seq: 9 });
    expect(out.points[0]).toEqual([0.1235, 0.5]);
    expect(out).not.toHaveProperty("authorId");
    expect(out).not.toHaveProperty("seq");
  });
});

describe("stroke:points y stroke:end", () => {
  it("valida lotes e id", () => {
    expect(ok(s["stroke:points"], { id, points: pts(10) })).toBe(true);
    expect(ok(s["stroke:points"], { id, points: pts(65) })).toBe(false);
    expect(ok(s["stroke:end"], { id })).toBe(true);
    expect(ok(s["stroke:end"], { id: "x" })).toBe(false);
  });
});

describe("chat:send", () => {
  it("acepta 1–500 caracteres tras recortar", () => {
    expect(s["chat:send"].parse({ text: "  hola " }).text).toBe("hola");
    expect(ok(s["chat:send"], { text: "x".repeat(500) })).toBe(true);
  });
  it("rechaza vacío, 501 caracteres y caracteres de control", () => {
    expect(ok(s["chat:send"], { text: "   " })).toBe(false);
    expect(ok(s["chat:send"], { text: "x".repeat(501) })).toBe(false);
    expect(ok(s["chat:send"], { text: "a\u0007b" })).toBe(false);
  });
  it("permite hasta 5 saltos de línea", () => {
    expect(ok(s["chat:send"], { text: "a\nb\nc\nd\ne\nf" })).toBe(true);
    expect(ok(s["chat:send"], { text: "a\nb\nc\nd\ne\nf\ng" })).toBe(false);
  });
  it("no interpreta HTML: lo conserva como texto", () => {
    expect(s["chat:send"].parse({ text: "<b>x</b>" }).text).toBe("<b>x</b>");
  });
});
