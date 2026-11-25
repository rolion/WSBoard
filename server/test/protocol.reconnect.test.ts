import { describe, expect, it } from "vitest";
import { newClient, startServer, strokeBody, until } from "./net";

describe("protocolo: reconexión", () => {
  it("tras caer, el participante queda reconnecting y resume lo recupera con snapshot completo", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    await a.chat("hola");
    a.socket.disconnect();
    await until(() => b.events("presence:status").length === 1, "reconnecting");
    expect(b.events("presence:status")[0]!.payload).toMatchObject({ participantId: a.id, status: "reconnecting" });

    const a2 = await newClient(url);
    const res = await a2.resume(a.token);
    if (!res.ok) throw new Error(res.error.code);
    expect(res.snapshot.selfId).toBe(a.id);
    expect(res.snapshot.chat.map((m) => m.text)).toEqual(["hola"]);
    expect(res.snapshot.participants.find((p) => p.id === a.id)!.status).toBe("connected");
    await until(() => b.events("presence:status").length === 2, "connected");
    expect(b.events("presence:status")[1]!.payload.status).toBe("connected");
    // el alias sigue reservado y la sesión sigue siendo la misma
    expect(await (await newClient(url)).join("Ana")).toMatchObject({ ok: false, error: { code: "ALIAS_TAKEN" } });
  });

  it("un resume desde otro socket cierra el anterior y no difunde cambios de presencia", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    const oldClosed = a.closed();
    const a2 = await newClient(url);
    expect((await a2.resume(a.token)).ok).toBe(true);
    await oldClosed;
    await b.chat("sincroniza");
    await until(() => b.events("chat:message").length === 1, "chat");
    expect(b.events("presence:status")).toHaveLength(0);
    expect(b.events("presence:left")).toHaveLength(0);
    await until(() => a2.events("chat:message").length === 1, "el nuevo socket recibe difusión");
  });

  it("SESSION_EXPIRED con token falso y tras reiniciar el servidor (otro epoch)", async () => {
    const first = await startServer();
    const a = await newClient(first.url, "Ana");
    const fake = await newClient(first.url);
    expect(await fake.resume("token-falso")).toMatchObject({ ok: false, error: { code: "SESSION_EXPIRED" } });
    await first.app.close();

    const second = await startServer();
    const c = await newClient(second.url);
    expect(await c.resume(a.token)).toMatchObject({ ok: false, error: { code: "SESSION_EXPIRED" } });
    const ack = await c.join("Ana");
    expect(ack.ok && ack.snapshot.epoch).toBe(second.app.room.epoch);
    expect(second.app.room.epoch).not.toBe(first.app.room.epoch);
  });

  it("un trazo abierto permanece abierto durante la gracia y el autor lo ve en su snapshot", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    const s = strokeBody();
    a.emit("stroke:start", s);
    await until(() => b.events("stroke:started").length === 1, "stroke:started");
    a.socket.disconnect();
    await until(() => b.events("presence:status").length === 1, "reconnecting");
    expect(b.events("stroke:ended")).toHaveLength(0);
    const a2 = await newClient(url);
    const res = await a2.resume(a.token);
    expect(res.ok && res.snapshot.strokes[0]).toMatchObject({ id: s.id, open: true });
  });
});
