import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("usa valores por defecto", () => {
    expect(loadConfig({})).toEqual({ port: 3001, allowedOrigins: ["http://localhost:5173"] });
  });

  it("parsea PORT y ALLOWED_ORIGINS con espacios, vacíos, barras finales y duplicados", () => {
    const config = loadConfig({ PORT: " 4000 ", ALLOWED_ORIGINS: " http://a.test/ , ,http://b.test,http://a.test" });
    expect(config).toEqual({ port: 4000, allowedOrigins: ["http://a.test", "http://b.test"] });
  });

  it.each(["abc", "0", "65536", "-1", "80.5", "1e3"])("rechaza PORT inválido %s", (PORT) => {
    expect(() => loadConfig({ PORT })).toThrow(/PORT inválido/);
  });

  it("rechaza ALLOWED_ORIGINS sin orígenes", () => {
    expect(() => loadConfig({ ALLOWED_ORIGINS: " , " })).toThrow(/ALLOWED_ORIGINS/);
    expect(() => loadConfig({ ALLOWED_ORIGINS: "" })).toThrow(/ALLOWED_ORIGINS/);
  });
});
