import { describe, expect, it } from "vitest";
import { CHAT_HISTORY } from "@pw/shared";
import { joined, makeRoom } from "./helpers";

describe("Room: chat", () => {
  it("difunde a todos incluido el emisor, con id y ts del servidor", () => {
    let t = 1_000;
    const { room, out } = makeRoom({ now: () => t });
    const a = joined(room, "a", "Ana");
    joined(room, "b", "Beto");
    t = 2_000;
    expect(room.chatSend("a", { text: "<b>hola</b>" })).toEqual({ ok: true });
    for (const conn of ["a", "b"]) {
      const msg = out.to(conn, "chat:message")[0]!.payload as unknown as { message: Record<string, unknown> };
      expect(msg.message).toMatchObject({ authorId: a.id, alias: "Ana", text: "<b>hola</b>", ts: 2_000 });
      expect(typeof msg.message.id).toBe("string");
    }
  });

  it("el historial conserva los últimos CHAT_HISTORY mensajes", () => {
    const { room } = makeRoom();
    joined(room, "a", "Ana");
    for (let i = 0; i < CHAT_HISTORY + 5; i++) room.chatSend("a", { text: `m${i}` });
    const { snapshot } = joined(room, "b", "Beto");
    expect(snapshot.chat).toHaveLength(CHAT_HISTORY);
    expect(snapshot.chat[0]!.text).toBe("m5");
    expect(snapshot.chat.at(-1)!.text).toBe(`m${CHAT_HISTORY + 4}`);
  });

  it("la tasa de chat es 5 por 10 s por participante y sobrevive a un resume", () => {
    let t = 0;
    const { room } = makeRoom({ now: () => t });
    const a = joined(room, "a", "Ana");
    const results = Array.from({ length: 6 }, () => room.allow("a", "chat"));
    expect(results).toEqual([true, true, true, true, true, false]);
    room.disconnect("a");
    room.resume("a2", { sessionToken: a.token });
    expect(room.allow("a2", "chat")).toBe(false);
    t = 10_000;
    expect(room.allow("a2", "chat")).toBe(true);
    expect(room.allow("sin-sesion", "chat")).toBe(false);
  });
});
