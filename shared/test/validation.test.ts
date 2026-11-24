import { describe, expect, it } from "vitest";
import { ERROR_CODES, SERVER_EVENTS, parseClientEvent } from "../src";
import type { PresenceLeftPayload } from "../src";
import { expectTypeOf } from "vitest";

const id = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const code = (e: string, p: unknown) => {
  const r = parseClientEvent(e, p);
  return r.ok ? "OK" : r.code;
};

// AC-9 (ADR de ajustes, A2): mapeo de fallos de esquema a códigos de error.
describe("parseClientEvent", () => {
  it("devuelve los datos normalizados cuando es válido", () => {
    const r = parseClientEvent("session:join", { alias: " Ana ", protocol: 1 });
    expect(r).toEqual({ ok: true, data: { alias: "Ana", protocol: 1 } });
  });

  it("session:join distingue protocolo y alias", () => {
    expect(code("session:join", { alias: "Ana", protocol: 2 })).toBe("PROTOCOL_MISMATCH");
    expect(code("session:join", { alias: "a", protocol: 1 })).toBe("ALIAS_INVALID");
    expect(code("session:join", { alias: "Ana" })).toBe("PROTOCOL_MISMATCH");
    expect(code("session:join", { alias: 5, protocol: 1 })).toBe("ALIAS_INVALID");
  });

  it("si fallan protocolo y alias gana PROTOCOL_MISMATCH", () => {
    expect(code("session:join", { alias: "a", protocol: 9 })).toBe("PROTOCOL_MISMATCH");
  });

  it("los eventos de trazo devuelven STROKE_INVALID", () => {
    expect(code("stroke:start", { id: "x" })).toBe("STROKE_INVALID");
    expect(code("stroke:points", { id, points: [] })).toBe("STROKE_INVALID");
    expect(code("stroke:end", {})).toBe("STROKE_INVALID");
  });

  it("chat:send devuelve CHAT_INVALID", () => {
    expect(code("chat:send", { text: "" })).toBe("CHAT_INVALID");
  });

  it("session:resume, payloads no objeto y eventos desconocidos devuelven PAYLOAD_INVALID", () => {
    expect(code("session:resume", {})).toBe("PAYLOAD_INVALID");
    expect(code("session:join", null)).toBe("PAYLOAD_INVALID");
    expect(code("stroke:start", "texto")).toBe("STROKE_INVALID");
    expect(code("nope", {})).toBe("PAYLOAD_INVALID");
  });

  // REV-14: nombres heredados de Object.prototype no deben lanzar excepción.
  it.each(["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf"])(
    "el evento desconocido %s devuelve PAYLOAD_INVALID sin lanzar",
    (name) => {
      expect(() => parseClientEvent(name, {})).not.toThrow();
      expect(code(name, {})).toBe("PAYLOAD_INVALID");
    },
  );

  it("un nombre de evento que no es cadena devuelve PAYLOAD_INVALID", () => {
    expect(code(undefined as unknown as string, {})).toBe("PAYLOAD_INVALID");
    expect(code(42 as unknown as string, {})).toBe("PAYLOAD_INVALID");
  });

  it("session:join con payload undefined o sin protocolo", () => {
    expect(code("session:join", undefined)).toBe("PAYLOAD_INVALID");
    expect(code("session:join", { alias: 5 })).toBe("PROTOCOL_MISMATCH");
  });

  it("session:leave no lleva payload", () => {
    expect(parseClientEvent("session:leave", undefined)).toEqual({ ok: true, data: undefined });
  });

  it("solo devuelve códigos declarados", () => {
    for (const [e, p] of [["session:join", {}], ["stroke:end", 1], ["chat:send", 1], ["session:resume", 1]] as const) {
      const r = parseClientEvent(e, p);
      // Todas estas entradas son inválidas: la prueba falla si alguna pasara.
      expect(r.ok).toBe(false);
      if (!r.ok) expect(ERROR_CODES).toContain(r.code);
    }
  });
});

// REV-06 / REV-07 (ajustes A5, A6)
describe("ajustes al contrato", () => {
  it('presence:left solo admite "leave" y "timeout"', () => {
    expectTypeOf<PresenceLeftPayload["reason"]>().toEqualTypeOf<"leave" | "timeout">();
  });
  it("seq:advance está declarado entre los eventos S→C", () => {
    expect(SERVER_EVENTS).toContain("seq:advance");
  });
});
