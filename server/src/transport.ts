import type { Server as IoServer, Socket } from "socket.io";
import {
  CLIENT_EVENTS,
  ERROR_EVENT,
  parseClientEvent,
  type ClientEventName,
  type ErrorCode,
  type ErrorPayload,
} from "@pw/shared";
import type { Outbox } from "./room/outbox";
import { Room, type Failure, type RoomOptions } from "./room/room";

type Ack = (response: unknown) => void;

/** Eventos con acknowledgement obligatorio (ADR de contrato). */
const ACK_EVENTS = new Set<string>(["session:join", "session:resume", "chat:send"]);
const PRE_JOIN_EVENTS = new Set<string>(["session:join", "session:resume"]);

/**
 * Enlaza los sockets con la sala: valida con `parseClientEvent`, aplica el orden de
 * comprobaciones del plan (NOT_JOINED → ack → tasa → esquema → dominio) y traduce los
 * resultados a acks o al evento `error`. Nunca lanza.
 */
export function attachRoom(io: IoServer, options?: RoomOptions): Room {
  const sockets = new Map<string, Socket>();
  const outbox: Outbox = {
    send: (conn, event, payload) => void sockets.get(conn)?.emit(event, payload),
    disconnect: (conn) => void sockets.get(conn)?.disconnect(true),
  };
  const room = new Room(outbox, options);

  io.on("connection", (socket) => {
    sockets.set(socket.id, socket);

    const reply = (ack: Ack | undefined, failure: Failure): void => {
      const error: { code: ErrorCode; message: string } = { code: failure.code, message: failure.message };
      if (ack) ack({ ok: false, error });
      else socket.emit(ERROR_EVENT, error satisfies ErrorPayload);
    };

    socket.onAny((event: unknown, ...args: unknown[]) => {
      const last = args[args.length - 1];
      const ack = typeof last === "function" ? (last as Ack) : undefined;
      const payload = typeof args[0] === "function" ? undefined : args[0];
      try {
        handle(event, payload, ack);
      } catch {
        // Un fallo interno no debe tumbar el servidor ni filtrar detalles.
        reply(ack, { ok: false, code: "PAYLOAD_INVALID", message: "No se pudo procesar el evento" });
      }
    });

    function handle(event: unknown, payload: unknown, ack: Ack | undefined): void {
      // Los `stroke:*` no tienen ack en el contrato: sus fallos siempre salen por el evento `error`.
      if (typeof event === "string" && event.startsWith("stroke:")) ack = undefined;
      const name = typeof event === "string" ? event : undefined;
      if (name === undefined || !(CLIENT_EVENTS as readonly string[]).includes(name)) {
        const parsed = parseClientEvent(String(event), payload);
        if (!parsed.ok) reply(ack, parsed);
        return;
      }
      const joined = room.isJoined(socket.id);

      if (name === "session:join" && joined) return reply(ack, notJoinedLike("ALREADY_JOINED"));
      if (name === "session:resume" && joined) return reply(ack, notJoinedLike("ALREADY_JOINED"));
      if (!PRE_JOIN_EVENTS.has(name) && !joined) return reply(ack, notJoinedLike("NOT_JOINED"));
      if (ACK_EVENTS.has(name) && !ack) {
        return reply(undefined, { ok: false, code: "PAYLOAD_INVALID", message: "Este evento requiere acknowledgement" });
      }

      if (name === "session:leave") {
        room.leave(socket.id);
        socket.disconnect(true);
        return;
      }
      const kind = name === "chat:send" ? "chat" : name.startsWith("stroke:") ? "stroke" : undefined;
      if (kind && !room.allow(socket.id, kind)) {
        return reply(ack, { ok: false, code: "RATE_LIMITED", message: "Demasiados eventos" });
      }

      const parsed = parseClientEvent(name as ClientEventName, payload);
      if (!parsed.ok) return reply(ack, parsed);
      const data = parsed.data as never;

      switch (name) {
        case "session:join":
          return respond(ack, room.join(socket.id, data));
        case "session:resume":
          return respond(ack, room.resume(socket.id, data));
        case "chat:send":
          return respond(ack, room.chatSend(socket.id, data));
        case "stroke:start":
          return respond(undefined, room.strokeStart(socket.id, data));
        case "stroke:points":
          return respond(undefined, room.strokePoints(socket.id, data));
        case "stroke:end":
          return respond(undefined, room.strokeEnd(socket.id, data));
      }
    }

    function respond(ack: Ack | undefined, result: { ok: boolean } & Record<string, unknown>): void {
      if (!result.ok) return reply(ack, result as unknown as Failure);
      ack?.(result);
    }

    socket.on("disconnect", () => {
      room.disconnect(socket.id);
      sockets.delete(socket.id);
    });
  });

  return room;
}

function notJoinedLike(code: "NOT_JOINED" | "ALREADY_JOINED"): Failure {
  return {
    ok: false,
    code,
    message: code === "NOT_JOINED" ? "Debes unirte primero" : "Este socket ya está unido",
  };
}
