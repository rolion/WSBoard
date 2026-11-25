import { describe, expect, it } from "vitest";
import { MAX_PARTICIPANTS } from "@pw/shared";
import { newClient, startServer, strokeBody, until } from "./net";

describe("protocolo: ingreso y presencia", () => {
  it("antes de unirse, trazos, chat y leave reciben NOT_JOINED y no cambian el estado", async () => {
    const { url } = await startServer();
    const ghost = await newClient(url);
    const ana = await newClient(url, "Ana");
    ghost.emit("stroke:start", strokeBody());
    ghost.emit("session:leave");
    const chatAck = await new Promise<any>((r) => ghost.socket.emit("chat:send", { text: "hola" }, r)); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(chatAck).toMatchObject({ ok: false, error: { code: "NOT_JOINED" } });
    await until(() => ghost.events("error").length === 2, "dos eventos error");
    expect(ghost.events("error").map((e) => e.payload.code)).toEqual(["NOT_JOINED", "NOT_JOINED"]);
    expect(ghost.socket.connected).toBe(true);
    expect(ana.log.filter((l) => l.event !== "connect")).toHaveLength(0); // nada se difundió
  });

  it("join devuelve token y snapshot; los demás reciben presence:joined", async () => {
    const { url } = await startServer();
    const ana = await newClient(url);
    const a = await ana.join("Ana");
    expect(a).toMatchObject({ ok: true });
    if (!a.ok) return;
    expect(a.snapshot).toMatchObject({ protocol: 1, seq: 1, selfId: ana.id, participants: [{ alias: "Ana" }] });

    const beto = await newClient(url);
    const b = await beto.join("Beto");
    expect(b.ok && b.snapshot.seq).toBe(2);
    await until(() => ana.events("presence:joined").length === 1, "presence:joined");
    expect(ana.events("presence:joined")[0]!.payload).toMatchObject({ seq: 2, participant: { id: beto.id, alias: "Beto" } });
    expect(beto.events("presence:joined")).toHaveLength(0);
    expect(JSON.stringify(ana.log)).not.toContain(beto.token);
  });

  it("errores de ingreso: alias, protocolo, duplicado y ya unido", async () => {
    const { url } = await startServer();
    await newClient(url, "Ana");
    const c = await newClient(url);
    expect(await c.join("A")).toMatchObject({ ok: false, error: { code: "ALIAS_INVALID" } });
    expect(await c.join("Beto", 2)).toMatchObject({ ok: false, error: { code: "PROTOCOL_MISMATCH" } });
    expect(await c.join("ANA")).toMatchObject({ ok: false, error: { code: "ALIAS_TAKEN" } });
    expect(await c.join("Carla")).toMatchObject({ ok: true });
    expect(await c.join("Otra")).toMatchObject({ ok: false, error: { code: "ALREADY_JOINED" } });
  });

  it("ROOM_FULL con el participante 31", async () => {
    const { url } = await startServer();
    for (let i = 0; i < MAX_PARTICIPANTS; i++) await newClient(url, `User ${i}`);
    const extra = await newClient(url);
    expect(await extra.join("Sobra")).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } });
  });

  it("session:leave libera el alias, difunde presence:left y cierra el socket", async () => {
    const { url } = await startServer();
    const ana = await newClient(url, "Ana");
    const beto = await newClient(url, "Beto");
    const closed = beto.closed();
    beto.emit("session:leave");
    await closed;
    await until(() => ana.events("presence:left").length === 1, "presence:left");
    expect(ana.events("presence:left")[0]!.payload).toMatchObject({ participantId: beto.id, reason: "leave" });
    const again = await newClient(url);
    expect(await again.join("Beto")).toMatchObject({ ok: true });
  });

  it("join sin acknowledgement no crea participante", async () => {
    const { url, app } = await startServer();
    const c = await newClient(url);
    c.emit("session:join", { alias: "Ana", protocol: 1 });
    await until(() => c.events("error").length === 1, "error");
    expect(c.events("error")[0]!.payload.code).toBe("PAYLOAD_INVALID");
    expect(app.room.isJoined(c.socket.id!)).toBe(false);
  });
});
