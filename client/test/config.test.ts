import { describe, expect, it } from "vitest";
import { DEFAULT_SERVER_URL, getServerUrl } from "../src/config";

describe("getServerUrl", () => {
  it("usa el valor por defecto", () => {
    expect(getServerUrl({})).toBe(DEFAULT_SERVER_URL);
    expect(getServerUrl({ VITE_SERVER_URL: "  " })).toBe(DEFAULT_SERVER_URL);
  });
  it("acepta http/https y quita barras finales", () => {
    expect(getServerUrl({ VITE_SERVER_URL: "https://x.test:8080/" })).toBe("https://x.test:8080");
  });
  it("rechaza URLs inválidas o con otro protocolo", () => {
    expect(() => getServerUrl({ VITE_SERVER_URL: "no-url" })).toThrow(/inválida/);
    expect(() => getServerUrl({ VITE_SERVER_URL: "ftp://x.test" })).toThrow(/http o https/);
  });
});
