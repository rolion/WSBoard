import { describe, expect, it } from "vitest";
import { newClient, startServer, until } from "./net";

describe("protocolo: errores de validación", () => {
  it("payloads inválidos devuelven el código del mapeo A2 y el servidor sigue operativo", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    const ack = (event: string, payload?: unknown) =>
      new Promise<any>((r) => a.socket.emit(event, payload, r)); // eslint-disable-line @typescript-eslint/no-explicit-any

    for (const bad of [null, "x", [], {}, { text: 5 }]) { // 5 intentos: tope de RATE_CHAT (S-3)
      expect(await ack("chat:send", bad)).toMatchObject({ ok: false, error: { code: "CHAT_INVALID" } });
    }
    for (const bad of [null, "x", [], {}, { sessionToken: 1 }]) {
      expect(await ack("session:resume", bad)).toMatchObject({ ok: false });
    }
    // El socket de A ya está unido: resume da ALREADY_JOINED antes de validar. Con un cliente nuevo:
    const c = await newClient(url);
    for (const bad of [null, "x", [], {}, { sessionToken: 1 }]) {
      const res = await new Promise<any>((r) => c.socket.emit("session:resume", bad, r)); // eslint-disable-line @typescript-eslint/no-explicit-any
      expect(res).toMatchObject({ ok: false, error: { code: "PAYLOAD_INVALID" } });
    }
    for (const bad of [null, "x", { id: "no-uuid" }, { id: 1, points: [] }]) {
      a.emit("stroke:start", bad);
      a.emit("stroke:points", bad);
      a.emit("stroke:end", bad);
    }
    await until(() => a.events("error").length === 12, "12 errores de trazo");
    expect(a.events("error").every((e) => e.payload.code === "STROKE_INVALID")).toBe(true);
    const join = await new Promise<any>((r) => c.socket.emit("session:join", null, r)); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(join).toMatchObject({ ok: false, error: { code: "PAYLOAD_INVALID" } });

    expect(b.log.filter((l) => l.event.startsWith("stroke:") || l.event === "chat:message")).toHaveLength(0);
    expect(await b.chat("sigo vivo")).toEqual({ ok: true });
  });

  it("evento desconocido o sin nombre válido: PAYLOAD_INVALID, por ack si lo hay", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    a.emit("nope", { x: 1 });
    expect(await new Promise<any>((r) => a.socket.emit("constructor", {}, r))).toMatchObject({ // eslint-disable-line @typescript-eslint/no-explicit-any
      ok: false,
      error: { code: "PAYLOAD_INVALID" },
    });
    await until(() => a.events("error").length === 1, "error por evento desconocido");
    expect(a.events("error")[0]!.payload.code).toBe("PAYLOAD_INVALID");
    expect(await a.chat("ok")).toEqual({ ok: true });
  });

  it("chat:send sin acknowledgement se rechaza sin difundir", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    a.emit("chat:send", { text: "hola" });
    await until(() => a.events("error").length === 1, "error");
    expect(a.events("error")[0]!.payload.code).toBe("PAYLOAD_INVALID");
    expect(a.events("chat:message")).toHaveLength(0);
  });
});
