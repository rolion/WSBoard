import type { Server as IoServer, Socket } from "socket.io";
import {
  CLIENT_EVENTS,
  ERROR_EVENT,
  ROOM_ID,
  parseClientEvent,
  type ErrorCode,
  type ErrorPayload,
  type JoinPayload,
  type ResumePayload,
} from "@pw/shared";
import type { Room, RoomHooks } from "./room";

type Ack = (response: unknown) => void;

const KNOWN_EVENTS = new Set<string>(CLIENT_EVENTS);

/** Puente entre Socket.IO y `Room`. Los tokens nunca se registran en logs. */
export function createRoomHooks(io: IoServer): RoomHooks {
  return {
    broadcast(event, payload, exceptSocketId) {
      const target = io.to(ROOM_ID);
      (exceptSocketId ? target.except(exceptSocketId) : target).emit(event, payload);
    },
    kick(socketId) {
      io.sockets.sockets.get(socketId)?.disconnect(true);
    },
  };
}

export function attachSession(io: IoServer, room: Room): void {
  io.on("connection", (socket) => {
    socket.onAny((event: unknown, ...args: unknown[]) => {
      const ack = typeof args.at(-1) === "function" ? (args.pop() as Ack) : undefined;
      try {
        dispatch(socket, room, event, args[0], ack);
      } catch (error) {
        // Nunca se vuelca el payload (puede contener el token).
        console.error(`[server] error procesando "${String(event)}": ${error instanceof Error ? error.message : "desconocido"}`);
        reject(socket, ack, String(event), "PAYLOAD_INVALID", "Error interno al procesar el evento");
      }
    });
    socket.on("disconnect", () => room.disconnect(socket.id));
  });
}

/** Un error de un evento con ack va solo por el ack; si no hay ack, por el evento `error` (A-1). */
function reject(socket: Socket, ack: Ack | undefined, event: string, code: ErrorCode, message: string): void {
  if (ack) {
    ack({ ok: false, error: { code, message } });
    return;
  }
  const payload: ErrorPayload = { code, message, ref: event };
  socket.emit(ERROR_EVENT, payload);
}

function dispatch(socket: Socket, room: Room, event: unknown, payload: unknown, ack: Ack | undefined): void {
  if (typeof event !== "string" || !KNOWN_EVENTS.has(event)) {
    const parsed = parseClientEvent(event as string, payload);
    reject(socket, ack, String(event), parsed.ok ? "PAYLOAD_INVALID" : parsed.code, parsed.ok ? "Evento desconocido" : parsed.message);
    return;
  }

  if (event === "session:join" || event === "session:resume") {
    // Sin ack el cliente nunca recibiría el token: se rechaza sin crear estado.
    if (!ack) {
      reject(socket, undefined, event, "PAYLOAD_INVALID", "Se requiere acknowledgement");
      return;
    }
    const parsed = parseClientEvent(event, payload);
    if (!parsed.ok) {
      reject(socket, ack, event, parsed.code, parsed.message);
      return;
    }
    if (event === "session:join") {
      const { alias } = parsed.data as JoinPayload;
      const result = room.join(socket.id, alias);
      if (result.ok) void socket.join(ROOM_ID);
      ack(result);
    } else {
      const { sessionToken } = parsed.data as ResumePayload;
      const result = room.resume(socket.id, sessionToken);
      if (result.ok) void socket.join(ROOM_ID);
      ack(result);
    }
    return;
  }

  if (!room.isJoined(socket.id)) {
    reject(socket, ack, event, "NOT_JOINED", "Debes unirte antes de enviar eventos");
    return;
  }

  if (event === "session:leave") {
    room.leave(socket.id);
    socket.disconnect(true);
  }
  // stroke:* y chat:send: sin manejador hasta PW-004 (se ignoran sin cambiar estado).
}
