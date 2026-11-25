import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_BYTES, RATE_STROKE_EVENTS } from "@pw/shared";
import { newClient, startServer, strokeBody, until } from "./net";

describe("protocolo: límites", () => {
  it("una ráfaga de stroke:* supera la tasa: RATE_LIMITED sin desconectar y sin cambiar el estado descartado", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    const s = strokeBody();
    a.emit("stroke:start", s);
    const total = RATE_STROKE_EVENTS + 20;
    for (let i = 0; i < total - 1; i++) a.emit("stroke:points", { id: s.id, points: [[0.2, 0.2]] });
    await until(() => a.events("error").length > 0, "RATE_LIMITED");
    expect(a.events("error").every((e) => e.payload.code === "RATE_LIMITED")).toBe(true);
    await until(
      () => b.events("stroke:started").length + b.events("stroke:appended").length === total - a.events("error").length,
      "eventos aceptados entregados",
    );
    expect(a.socket.connected).toBe(true);
    expect(b.events("stroke:appended").length).toBeLessThanOrEqual(RATE_STROKE_EVENTS - 1);
  });

  it("un mensaje de MAX_MESSAGE_BYTES + 1 cierra el socket, no cambia el estado y el participante queda en gracia", async () => {
    const { url, app } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    const closed = a.closed();
    a.emit("chat:send", { text: "x".repeat(MAX_MESSAGE_BYTES + 1) }, () => undefined);
    await closed;
    await until(() => b.events("presence:status").length === 1, "presence:status");
    expect(b.events("presence:status")[0]!.payload).toMatchObject({ participantId: a.id, status: "reconnecting" });
    expect(b.events("chat:message")).toHaveLength(0);
    const again = await newClient(url);
    expect((await again.resume(a.token)).ok).toBe(true);
    expect(app.room.isJoined(again.socket.id!)).toBe(true);
  });

  it("el borde exacto: MAX_MESSAGE_BYTES + 1 bytes (16 385) cierra el socket", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const overhead = JSON.stringify(["nope", ""]).length + 2;
    const closed = a.closed();
    a.emit("nope", "x".repeat(MAX_MESSAGE_BYTES + 1 - overhead));
    await closed;
    expect(a.socket.connected).toBe(false);
  });

  it("un mensaje de exactamente MAX_MESSAGE_BYTES no cierra el socket", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const overhead = JSON.stringify(["nope", ""]).length + 2; // prefijo "42" del paquete de evento
    a.emit("nope", "x".repeat(MAX_MESSAGE_BYTES - overhead));
    await until(() => a.events("error").length === 1, "el servidor procesó el mensaje");
    expect(a.events("error")[0]!.payload.code).toBe("PAYLOAD_INVALID");
    expect(a.socket.connected).toBe(true);
  });
});
