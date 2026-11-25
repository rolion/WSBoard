import { describe, expect, it } from "vitest";
import { newClient, startServer, strokeBody, until } from "./net";

describe("protocolo: sincronización y orden", () => {
  it("entrada tardía: snapshot con trazo abierto y chat; luego eventos con seq > snapshot.seq", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const body = strokeBody(2);
    a.emit("stroke:start", body);
    await a.chat("antes de llegar");
    await until(() => a.events("seq:advance").length === 1, "stroke:start procesado");

    const late = await newClient(url);
    const ack = await late.join("Tarde");
    if (!ack.ok) throw new Error(ack.error.code);
    expect(ack.snapshot.strokes).toMatchObject([{ id: body.id, open: true }]);
    expect(ack.snapshot.strokes[0]!.points).toHaveLength(2);
    expect(ack.snapshot.chat.map((m) => m.text)).toEqual(["antes de llegar"]);

    a.emit("stroke:points", { id: body.id, points: [[0.7, 0.7]] });
    await until(() => late.events("stroke:appended").length === 1, "stroke:appended");
    expect(late.events("stroke:appended")[0]!.payload.seq).toBe(ack.snapshot.seq + 1);
  });

  it("seq sin huecos ni duplicados para cada cliente mientras otro entra y todos publican", async () => {
    const { url } = await startServer();
    const a = await newClient(url);
    const b = await newClient(url);
    const ackA = await a.join("Ana");
    const ackB = await b.join("Beto");
    const c = await newClient(url);
    if (!ackA.ok || !ackB.ok) throw new Error("join falló");
    const sa = strokeBody(1);
    const sb = strokeBody(1);
    a.emit("stroke:start", sa);
    b.emit("stroke:start", sb);
    const joining = c.join("Carla");
    for (let i = 0; i < 20; i++) {
      a.emit("stroke:points", { id: sa.id, points: [[i / 100, 0.1]] });
      b.emit("stroke:points", { id: sb.id, points: [[i / 100, 0.9]] });
      if (i % 7 === 0) void a.chat(`a${i}`); // 3 mensajes: dentro de RATE_CHAT
    }
    const ackC = await joining;
    if (!ackC.ok) throw new Error(ackC.error.code);
    // Barrera: el servidor procesa en orden, así que cuando "fin" llega a todos ya llegó todo lo anterior.
    expect(await b.chat("fin")).toEqual({ ok: true });
    for (const client of [a, b, c]) {
      await until(() => client.events("chat:message").some((m) => m.payload.message.text === "fin"), "mensaje fin");
    }
    const contiguous = (client: typeof a, snapshotSeq: number) => {
      const seqs = client.seqs();
      expect(seqs.length).toBeGreaterThan(0);
      seqs.forEach((s, i) => expect(s).toBe(snapshotSeq + 1 + i));
    };
    contiguous(a, ackA.snapshot.seq);
    contiguous(b, ackB.snapshot.seq);
    contiguous(c, ackC.snapshot.seq);
    expect(a.seqs().at(-1)).toBe(b.seqs().at(-1));
    expect(b.seqs().at(-1)).toBe(c.seqs().at(-1));
  });
});
