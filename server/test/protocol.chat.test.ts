import { describe, expect, it } from "vitest";
import { newClient, startServer, until } from "./net";

describe("protocolo: chat", () => {
  it("ack ok y chat:message para emisor y receptor, con el mismo seq", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    const b = await newClient(url, "Beto");
    expect(await a.chat("  <script>x</script>  ")).toEqual({ ok: true });
    await until(() => a.events("chat:message").length === 1 && b.events("chat:message").length === 1, "chat:message");
    const [ma, mb] = [a.events("chat:message")[0]!.payload, b.events("chat:message")[0]!.payload];
    expect(ma).toEqual(mb);
    expect(ma.message).toMatchObject({ authorId: a.id, alias: "Ana", text: "<script>x</script>" }); // texto plano, recortado
  });

  it("CHAT_INVALID por ack y RATE_LIMITED al sexto mensaje sin desconectar", async () => {
    const { url } = await startServer();
    const a = await newClient(url, "Ana");
    expect(await a.chat("")).toMatchObject({ ok: false, error: { code: "CHAT_INVALID" } });
    for (let i = 0; i < 4; i++) expect(await a.chat(`m${i}`)).toEqual({ ok: true });
    // 5 intentos contados (1 inválido + 4); el sexto se descarta
    expect(await a.chat("sexto")).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } } as never);
    expect(a.socket.connected).toBe(true);
  });
});
