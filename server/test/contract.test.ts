/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { CLIENT_EVENTS, ERROR_CODES, SERVER_EVENTS } from "@pw/shared";
import { newClient, startServer, strokeBody, until, type Client } from "./net";

/**
 * Prueba de contrato: recorre un escenario que ejercita cada evento C→S, cada evento S→C y
 * cada código de error del ADR, y comprueba que no queda ninguno sin cubrir.
 */
describe("contrato: cobertura de eventos y códigos de error", () => {
  it("ejercita todos los CLIENT_EVENTS, SERVER_EVENTS y ERROR_CODES", async () => {
    const { url } = await startServer({ limits: { maxStrokes: 1 } });
    const sent = new Set<string>();
    const errors = new Set<string>();
    const received = new Set<string>();
    const track = (c: Client) =>
      c.socket.onAny((e: string, p: any) => {
        received.add(e);
        if (e === "error") errors.add(p.code);
      });
    const emit = (c: Client, e: string, p?: unknown) => {
      sent.add(e);
      c.emit(e, p);
    };
    const ack = async (c: Client, e: string, p?: unknown) => {
      sent.add(e);
      const r = await new Promise<any>((res) => c.socket.emit(e, p, res));
      if (r.ok === false) errors.add(r.error.code);
      return r;
    };

    const ghost = await newClient(url);
    await ack(ghost, "chat:send", { text: "x" }); // NOT_JOINED
    const a = await newClient(url);
    track(a);
    await ack(a, "session:join", { alias: "A", protocol: 1 }); // ALIAS_INVALID
    await ack(a, "session:join", { alias: "Ana", protocol: 9 }); // PROTOCOL_MISMATCH
    await ack(a, "session:join", null); // PAYLOAD_INVALID
    expect((await ack(a, "session:join", { alias: "Ana", protocol: 1 })).ok).toBe(true);
    await ack(a, "session:join", { alias: "Otra", protocol: 1 }); // ALREADY_JOINED
    const b = await newClient(url);
    await ack(b, "session:join", { alias: "ana", protocol: 1 }); // ALIAS_TAKEN
    const bAck = await ack(b, "session:join", { alias: "Beto", protocol: 1 });
    track(b);
    const crowd: Client[] = [];
    for (let i = 0; i < 28; i++) crowd.push(await newClient(url, `Extra ${i}`));
    const full = await newClient(url);
    await ack(full, "session:join", { alias: "Sobra", protocol: 1 }); // ROOM_FULL (30 en la sala)
    const stale = await newClient(url);
    await ack(stale, "session:resume", { sessionToken: "falso" }); // SESSION_EXPIRED
    await ack(a, "chat:send", { text: "" }); // CHAT_INVALID
    emit(a, "stroke:end", { id: "no" }); // STROKE_INVALID
    const s1 = strokeBody();
    emit(a, "stroke:start", s1);
    emit(a, "stroke:start", strokeBody()); // STROKE_LIMIT
    emit(a, "stroke:points", { id: s1.id, points: [[0.1, 0.1]] });
    emit(a, "stroke:end", { id: s1.id });
    emit(b, "stroke:start", strokeBody()); // BOARD_FULL (maxStrokes = 1)
    for (let i = 0; i < 70; i++) emit(a, "stroke:points", { id: s1.id, points: [[0.1, 0.1]] }); // RATE_LIMITED
    await ack(b, "chat:send", { text: "hola" });
    emit(a, "evento-desconocido"); // PAYLOAD_INVALID

    // b cae y vuelve (presence:status); un participante sale (presence:left)
    b.socket.disconnect();
    await until(() => received.has("presence:status"), "presence:status reconnecting");
    const b2 = await newClient(url);
    track(b2);
    await ack(b2, "session:resume", { sessionToken: bAck.sessionToken });
    emit(crowd[0]!, "session:leave");

    await until(
      () => SERVER_EVENTS.every((e) => received.has(e)) && ERROR_CODES.every((e) => errors.has(e)),
      "cobertura completa",
    );
    expect([...CLIENT_EVENTS].filter((e) => !sent.has(e))).toEqual([]);
    expect(SERVER_EVENTS.filter((e) => !received.has(e))).toEqual([]);
    expect(ERROR_CODES.filter((e) => !errors.has(e))).toEqual([]);
  });
});
