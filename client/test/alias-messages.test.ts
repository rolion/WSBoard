import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@pw/shared";
import { SESSION_EXPIRED_NOTICE, entryErrorMessage, type EntryError } from "../src/alias-messages";

describe("entryErrorMessage", () => {
  it("explica cada error de entrada con un texto claro", () => {
    expect(entryErrorMessage("ALIAS_INVALID")).toContain("2 y 20 caracteres");
    expect(entryErrorMessage("ALIAS_TAKEN")).toBe("Ese nombre ya está en uso. Elige otro.");
    expect(entryErrorMessage("ROOM_FULL")).toContain("30 de 30");
    expect(entryErrorMessage("PROTOCOL_MISMATCH")).toContain("Recarga");
    expect(entryErrorMessage("TIMEOUT")).toContain("no respondió");
    expect(entryErrorMessage("OFFLINE")).toContain("No se pudo conectar");
  });

  it("cualquier otro código da el mensaje genérico, nunca vacío ni el código crudo", () => {
    for (const code of [...ERROR_CODES, "TIMEOUT", "OFFLINE"] as EntryError[]) {
      const msg = entryErrorMessage(code);
      expect(msg.length).toBeGreaterThan(10);
      expect(msg).not.toContain(code);
    }
    expect(entryErrorMessage("RATE_LIMITED")).toBe("No se pudo entrar. Inténtalo de nuevo.");
  });

  it("el aviso de sesión expirada no afirma que se perdió el dibujo sin condición", () => {
    expect(SESSION_EXPIRED_NOTICE).toContain("Si la sala se reinició");
  });
});
