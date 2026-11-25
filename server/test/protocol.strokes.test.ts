import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newClient, startServer, strokeBody, until } from "./net";

describe("protocolo: trazos", () => {
  it("B recibe started/appended/ended; A solo seq:advance con los mismos seq", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    const body = strokeBody(2);
    a.emit("stroke:start", body);
    a.emit("stroke:points", { id: body.id, points: [[0.9, 0.9]] });
    a.emit("stroke:end", { id: body.id });
    await until(() => b.events("stroke:ended").length === 1 && a.events("seq:advance").length === 3, "trazo completo");

    expect(b.events("stroke:started")[0]!.payload).toMatchObject({ stroke: { id: body.id, authorId: a.id, open: true } });
    expect(b.events("stroke:appended")[0]!.payload).toMatchObject({ id: body.id, points: [[0.9, 0.9]] });
    const strokeSeqs = b.log.filter((l) => l.event.startsWith("stroke:")).map((l) => l.payload.seq);
    expect(a.events("seq:advance").map((l) => l.payload.seq)).toEqual(strokeSeqs);
    expect(a.events("stroke:started")).toHaveLength(0); // el autor no recibe su propio trazo
  });

  it("STROKE_LIMIT, id repetido y trazo ajeno llegan como evento error al emisor", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    const s = strokeBody();
    a.emit("stroke:start", s);
    a.emit("stroke:start", strokeBody());
    b.emit("stroke:points", { id: s.id, points: [[0.1, 0.1]] });
    b.emit("stroke:start", s);
    await until(() => a.events("error").length === 1 && b.events("error").length === 2, "errores");
    expect(a.events("error")[0]!.payload.code).toBe("STROKE_LIMIT");
    expect(b.events("error").map((e) => e.payload.code)).toEqual(["STROKE_INVALID", "STROKE_INVALID"]);
    expect(b.events("stroke:appended")).toHaveLength(0);
  });

  it("un cierre inexistente es STROKE_INVALID y no consume seq", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    a.emit("stroke:end", { id: randomUUID() });
    await until(() => a.events("error").length === 1, "error");
    expect(a.seqs()).toEqual([]);
  });
});
