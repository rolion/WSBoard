import { describe, expect, it } from "vitest";
import { aliasKey, aliasSchema, normalizeAlias } from "../src/schemas";

const ok = (s: string) => aliasSchema.safeParse(s).success;

// AC-2
describe("alias", () => {
  it("normaliza NFKC y recorta", () => {
    expect(normalizeAlias("  Ａna  ")).toBe("Ana");
    expect(aliasSchema.parse("  Luis ")).toBe("Luis");
  });

  it("acepta letras Unicode, dígitos, espacio simple, _ - .", () => {
    for (const a of ["Ana", "José Ñu", "user_1", "a-b.c", "日本語", "Ab"]) expect(ok(a)).toBe(true);
  });

  it("rechaza longitud fuera de 2–20 (en caracteres, no bytes)", () => {
    expect(ok("a")).toBe(false);
    expect(ok("")).toBe(false);
    expect(ok("x".repeat(20))).toBe(true);
    expect(ok("x".repeat(21))).toBe(false);
    expect(ok("日".repeat(20))).toBe(true);
  });

  it("rechaza espacios dobles y caracteres no permitidos", () => {
    for (const a of ["a  b", "a<b>", "a@b", "a/b", "😀😀", "ab\ncd"]) expect(ok(a)).toBe(false);
  });

  it("la clave de unicidad ignora mayúsculas y forma Unicode", () => {
    expect(aliasKey("ANA")).toBe(aliasKey(" ana "));
    expect(aliasKey("Ａna")).toBe(aliasKey("ana"));
    expect(aliasKey("Ana")).not.toBe(aliasKey("Ana2"));
  });
});
