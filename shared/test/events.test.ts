import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIENT_EVENT_SCHEMAS, CLIENT_EVENTS, ERROR_CODES, ERROR_EVENT, SERVER_EVENTS } from "../src";

const adr = readFileSync(
  resolve(__dirname, "../../docs/adr/ADR-pw-000-definicion-mvp-contrato-eventos.md"),
  "utf8",
);
const arch = readFileSync(
  resolve(__dirname, "../../docs/adr/ADR-pw-000-definicion-mvp-arquitectura.md"),
  "utf8",
);

// AC-5
describe("contrato de eventos", () => {
  it("declara exactamente los eventos C→S del ADR", () => {
    expect([...CLIENT_EVENTS].sort()).toEqual(
      ["chat:send", "session:join", "session:leave", "session:resume", "stroke:end", "stroke:points", "stroke:start"].sort(),
    );
    for (const name of Object.keys(CLIENT_EVENT_SCHEMAS)) expect(CLIENT_EVENTS).toContain(name);
  });

  it("declara exactamente los eventos S→C del ADR", () => {
    expect([...SERVER_EVENTS].sort()).toEqual(
      [
        "chat:message", "presence:joined", "presence:left", "presence:status",
        "seq:advance", "stroke:appended", "stroke:ended", "stroke:started",
      ].sort(),
    );
  });

  it("declara los 13 códigos de error del ADR", () => {
    expect(ERROR_CODES).toHaveLength(13);
    expect(new Set(ERROR_CODES).size).toBe(13);
  });

  // AC-6: el documento y shared/ no se desalinean.
  it("cada evento y código de shared/ aparece en el ADR de contrato", () => {
    for (const e of [...CLIENT_EVENTS, ...SERVER_EVENTS, ERROR_EVENT]) {
      expect(adr, `evento ${e}`).toContain("`" + e + "`");
    }
    for (const c of ERROR_CODES) expect(adr, `código ${c}`).toContain(c);
  });

  // AC-7: política de reinicio.
  it("SESSION_EXPIRED está declarado y documentado como política de reinicio", () => {
    expect(ERROR_CODES).toContain("SESSION_EXPIRED");
    expect(arch).toMatch(/Reinicio del servidor/);
    expect(arch).toContain("SESSION_EXPIRED");
  });
});
