import { randomBytes, randomUUID } from "node:crypto";
import {
  MAX_PARTICIPANTS,
  PROTOCOL_VERSION,
  RECONNECT_GRACE_MS,
  aliasKey,
  type ErrorCode,
  type JoinAck,
  type Participant,
  type ParticipantId,
  type ResumeAck,
  type ServerEventPayloads,
  type Snapshot,
} from "@pw/shared";

/** Temporizador inyectable: permite probar la gracia sin esperar. */
export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const systemClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as NodeJS.Timeout),
};

type PresenceEvent = "presence:joined" | "presence:status" | "presence:left";

/** Salidas de la sala hacia el transporte; `Room` no conoce Socket.IO. */
export interface RoomHooks {
  /** Difunde a todos los participantes unidos (menos `exceptSocketId`). */
  broadcast<E extends PresenceEvent>(event: E, payload: ServerEventPayloads[E], exceptSocketId?: string): void;
  /** Cierra un socket que ya no es el vigente de su participante. */
  kick(socketId: string): void;
}

export interface RoomOptions {
  reconnectGraceMs?: number;
  clock?: Clock;
  epoch?: string;
}

interface Entry {
  id: ParticipantId;
  alias: string;
  key: string;
  token: string;
  /** `null` mientras está en gracia. */
  socketId: string | null;
  timer: unknown;
}

const fail = (code: ErrorCode, message: string): { ok: false; error: { code: ErrorCode; message: string } } => ({
  ok: false,
  error: { code, message },
});

/**
 * Estado en memoria de la sala `main`: participantes, reserva de alias, tokens,
 * `epoch` y `seq`. Todo método es síncrono: la comprobación y la reserva del alias
 * ocurren en el mismo turno, sin `await` entre medias (reserva atómica).
 */
export class Room {
  readonly epoch: string;
  private seq = 0;
  private disposed = false;
  private readonly graceMs: number;
  private readonly clock: Clock;
  private readonly byId = new Map<ParticipantId, Entry>();
  private readonly byKey = new Map<string, ParticipantId>();
  private readonly byToken = new Map<string, ParticipantId>();
  private readonly bySocket = new Map<string, ParticipantId>();

  constructor(
    private readonly hooks: RoomHooks,
    options: RoomOptions = {},
  ) {
    this.epoch = options.epoch ?? randomUUID();
    this.graceMs = options.reconnectGraceMs ?? RECONNECT_GRACE_MS;
    this.clock = options.clock ?? systemClock;
  }

  get size(): number {
    return this.byId.size;
  }

  /** Alias ya normalizado por `parseClientEvent`. */
  join(socketId: string, alias: string): JoinAck {
    // ALREADY_JOINED primero: un socket unido que repite su propio alias no debe ver ALIAS_TAKEN.
    if (this.bySocket.has(socketId)) return fail("ALREADY_JOINED", "Este socket ya está unido");
    const key = aliasKey(alias);
    if (this.byKey.has(key)) return fail("ALIAS_TAKEN", "El alias ya está en uso");
    if (this.byId.size >= MAX_PARTICIPANTS) return fail("ROOM_FULL", "La sala está llena");

    const entry: Entry = {
      id: this.newId(),
      alias,
      key,
      token: randomBytes(16).toString("hex"),
      socketId,
      timer: null,
    };
    this.byId.set(entry.id, entry);
    this.byKey.set(key, entry.id);
    this.byToken.set(entry.token, entry.id);
    this.bySocket.set(socketId, entry.id);

    // El `seq` de `presence:joined` se asigna antes del snapshot (A6).
    this.hooks.broadcast(
      "presence:joined",
      { seq: this.nextSeq(), participant: this.participantOf(entry) },
      socketId,
    );
    return { ok: true, sessionToken: entry.token, snapshot: this.snapshot(entry) };
  }

  resume(socketId: string, token: string): ResumeAck {
    if (this.bySocket.has(socketId)) return fail("ALREADY_JOINED", "Este socket ya está unido");
    const id = this.byToken.get(token);
    const entry = id === undefined ? undefined : this.byId.get(id);
    if (!entry) return fail("SESSION_EXPIRED", "La sesión expiró");

    if (entry.socketId === null) {
      this.clock.clearTimeout(entry.timer);
      entry.timer = null;
      entry.socketId = socketId;
      this.bySocket.set(socketId, entry.id);
      this.hooks.broadcast("presence:status", {
        seq: this.nextSeq(),
        participantId: entry.id,
        status: "connected",
      });
    } else {
      // Pestaña duplicada con el mismo token: el socket anterior deja de ser el vigente
      // antes de cerrarlo, para que su desconexión no cambie la presencia.
      const previous = entry.socketId;
      this.bySocket.delete(previous);
      entry.socketId = socketId;
      this.bySocket.set(socketId, entry.id);
      this.hooks.kick(previous);
    }
    return { ok: true, snapshot: this.snapshot(entry) };
  }

  /** Salida voluntaria. Devuelve `false` si el socket no estaba unido. */
  leave(socketId: string): boolean {
    const entry = this.entryOf(socketId);
    if (!entry) return false;
    this.bySocket.delete(socketId);
    this.remove(entry, "leave");
    return true;
  }

  /** Caída del socket: el participante pasa a `reconnecting` durante la gracia. */
  disconnect(socketId: string): void {
    const entry = this.entryOf(socketId);
    if (!entry) return;
    this.bySocket.delete(socketId);
    entry.socketId = null;
    // Tras `dispose` (cierre del servidor) no se arman temporizadores nuevos.
    if (this.disposed) return;
    entry.timer = this.clock.setTimeout(() => this.expire(entry), this.graceMs);
    this.hooks.broadcast("presence:status", {
      seq: this.nextSeq(),
      participantId: entry.id,
      status: "reconnecting",
    });
  }

  isJoined(socketId: string): boolean {
    return this.bySocket.has(socketId);
  }

  /** Cancela los temporizadores pendientes. */
  dispose(): void {
    this.disposed = true;
    for (const entry of this.byId.values()) this.clock.clearTimeout(entry.timer);
  }

  private expire(entry: Entry): void {
    // Si volvió (`resume`) o ya salió, la gracia ya no aplica.
    if (entry.socketId !== null || this.byId.get(entry.id) !== entry) return;
    this.remove(entry, "timeout");
  }

  private remove(entry: Entry, reason: "leave" | "timeout"): void {
    this.clock.clearTimeout(entry.timer);
    entry.timer = null;
    this.byId.delete(entry.id);
    this.byKey.delete(entry.key);
    this.byToken.delete(entry.token);
    this.hooks.broadcast("presence:left", { seq: this.nextSeq(), participantId: entry.id, reason });
  }

  private entryOf(socketId: string): Entry | undefined {
    const id = this.bySocket.get(socketId);
    return id === undefined ? undefined : this.byId.get(id);
  }

  private participantOf(entry: Entry): Participant {
    return { id: entry.id, alias: entry.alias, status: entry.socketId === null ? "reconnecting" : "connected" };
  }

  private snapshot(self: Entry): Snapshot {
    return {
      protocol: PROTOCOL_VERSION,
      epoch: this.epoch,
      seq: this.seq,
      selfId: self.id,
      participants: [...this.byId.values()].map((e) => this.participantOf(e)),
      strokes: [],
      chat: [],
    };
  }

  private nextSeq(): number {
    return ++this.seq;
  }

  private newId(): ParticipantId {
    let id: string;
    do id = randomBytes(6).toString("base64url");
    while (this.byId.has(id));
    return id;
  }
}
