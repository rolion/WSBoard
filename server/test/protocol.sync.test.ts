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

  it("seq sin huecos ni retrocesos para cada cliente mientras otro entra y todos publican", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    const sa = strokeBody(1);
    const sb = strokeBody(1);
    a.emit("stroke:start", sa);
    b.emit("stroke:start", sb);
    const c = await newClient(url);
    const joining = c.join("Carla");
    for (let i = 0; i < 20; i++) {
      a.emit("stroke:points", { id: sa.id, points: [[i / 100, 0.1]] });
      b.emit("stroke:points", { id: sb.id, points: [[i / 100, 0.9]] });
      void a.chat(`a${i % 4}`);
    }
    const ack = await joining;
    if (!ack.ok) throw new Error(ack.error.code);
    await until(() => a.events("seq:advance").length === 21 && b.events("seq:advance").length === 21, "eventos de trazo");
    await until(() => a.events("chat:message").length >= 4, "chat");
    await new Promise<void>((r) => setImmediate(r));

    for (const client of [a, b]) {
      const seqs = client.seqs();
      const sorted = [...seqs].sort((x, y) => x - y);
      expect(seqs).toEqual(sorted);
    }
    // Para C: lo anterior al snapshot está dentro de él; lo posterior continúa sin hueco.
    const after = c.seqs().filter((s) => s > ack.snapshot.seq);
    expect(c.seqs().every((s) => s > ack.snapshot.seq)).toBe(true);
    after.forEach((s, i) => expect(s).toBe(ack.snapshot.seq + 1 + i));
  });
});
