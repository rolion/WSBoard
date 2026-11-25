import { randomBytes, randomUUID } from "node:crypto";
import {
  CHAT_HISTORY,
  MAX_PARTICIPANTS,
  MAX_POINTS_PER_STROKE,
  MAX_STROKES,
  MAX_TOTAL_POINTS,
  PROTOCOL_VERSION,
  RATE_CHAT,
  RATE_STROKE_EVENTS,
  RECONNECT_GRACE_MS,
  aliasKey,
  type ChatMessage,
  type ChatSendPayload,
  type ErrorCode,
  type JoinPayload,
  type Participant,
  type ParticipantStatus,
  type ResumePayload,
  type ServerEventName,
  type ServerEventPayloads,
  type Snapshot,
  type Stroke,
  type StrokeEndPayload,
  type StrokePointsPayload,
  type StrokeStartPayload,
} from "@pw/shared";
import type { ConnectionId, Outbox } from "./outbox";
import { RateLimiter } from "./rate-limit";

export type Failure = { ok: false; code: ErrorCode; message: string };
export type Result<T extends object = object> = ({ ok: true } & T) | Failure;

/** Límites efectivos. En producción siempre los de `shared/src/limits.ts`; las pruebas pueden reducirlos. */
export interface RoomLimits {
  maxParticipants: number;
  maxStrokes: number;
  maxTotalPoints: number;
  maxPointsPerStroke: number;
  chatHistory: number;
  graceMs: number;
}

export interface RoomOptions {
  limits?: Partial<RoomLimits>;
  now?: () => number;
}

interface Member {
  id: string;
  alias: string;
  aliasKey: string;
  token: string;
  status: ParticipantStatus;
  conn: ConnectionId | null;
  graceTimer: NodeJS.Timeout | null;
  openStrokeId: string | null;
  chatLimiter: RateLimiter;
}

const fail = (code: ErrorCode, message: string): Failure => ({ ok: false, code, message });
const cloneStroke = (s: Stroke): Stroke => ({ ...s, points: s.points.map((p) => [p[0], p[1]]) });

/**
 * Estado autoritativo de la sala única. Todas las operaciones son síncronas: `seq`
 * se asigna y se difunde en el mismo turno, sin `await` entre mutar y emitir.
 */
export class Room {
  readonly epoch = randomUUID();
  private seq = 0;
  private readonly limits: RoomLimits;
  private readonly now: () => number;
  private readonly members = new Map<string, Member>();
  private readonly byToken = new Map<string, Member>();
  private readonly byConn = new Map<ConnectionId, Member>();
  private readonly strokeLimiters = new Map<ConnectionId, RateLimiter>();
  private readonly strokes: Stroke[] = [];
  private readonly strokeById = new Map<string, Stroke>();
  private totalPoints = 0;
  private chat: ChatMessage[] = [];

  constructor(
    private readonly outbox: Outbox,
    options: RoomOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.limits = {
      maxParticipants: MAX_PARTICIPANTS,
      maxStrokes: MAX_STROKES,
      maxTotalPoints: MAX_TOTAL_POINTS,
      maxPointsPerStroke: MAX_POINTS_PER_STROKE,
      chatHistory: CHAT_HISTORY,
      graceMs: RECONNECT_GRACE_MS,
      ...options.limits,
    };
  }

  // ---- Consultas -----------------------------------------------------------

  isJoined(conn: ConnectionId): boolean {
    return this.byConn.has(conn);
  }

  /** Cuenta un evento contra la tasa de la conexión (`stroke`) o del participante (`chat`). */
  allow(conn: ConnectionId, kind: "stroke" | "chat"): boolean {
    if (kind === "stroke") {
      let limiter = this.strokeLimiters.get(conn);
      if (!limiter) {
        limiter = new RateLimiter(RATE_STROKE_EVENTS, 1000, this.now);
        this.strokeLimiters.set(conn, limiter);
      }
      return limiter.allow();
    }
    return this.byConn.get(conn)?.chatLimiter.allow() ?? false;
  }

  // ---- Sesión --------------------------------------------------------------

  join(conn: ConnectionId, payload: JoinPayload): Result<{ sessionToken: string; snapshot: Snapshot }> {
    if (this.byConn.has(conn)) return fail("ALREADY_JOINED", "Este socket ya está unido");
    const key = aliasKey(payload.alias);
    for (const m of this.members.values()) {
      if (m.aliasKey === key) return fail("ALIAS_TAKEN", "El alias ya está en uso");
    }
    if (this.members.size >= this.limits.maxParticipants) return fail("ROOM_FULL", "La sala está llena");

    const member: Member = {
      id: this.newId(),
      alias: payload.alias,
      aliasKey: key,
      token: randomBytes(16).toString("base64url"),
      status: "connected",
      conn: null,
      graceTimer: null,
      openStrokeId: null,
      chatLimiter: new RateLimiter(RATE_CHAT.messages, RATE_CHAT.windowMs, this.now),
    };
    this.members.set(member.id, member);
    this.byToken.set(member.token, member);
    // El nuevo participante aún no está vinculado: no recibe su propio `presence:joined`.
    this.broadcast("presence:joined", { participant: this.toParticipant(member) });
    this.bind(member, conn);
    return { ok: true, sessionToken: member.token, snapshot: this.snapshot(member.id) };
  }

  resume(conn: ConnectionId, payload: ResumePayload): Result<{ snapshot: Snapshot }> {
    if (this.byConn.has(conn)) return fail("ALREADY_JOINED", "Este socket ya está unido");
    const member = this.byToken.get(payload.sessionToken);
    if (!member) return fail("SESSION_EXPIRED", "La sesión expiró");

    if (member.conn !== null) {
      // Pestaña duplicada: el socket anterior se sustituye sin cambiar la presencia.
      const old = member.conn;
      this.unbind(member);
      this.outbox.disconnect(old);
    } else {
      this.clearGrace(member);
      member.status = "connected";
      this.broadcast("presence:status", { participantId: member.id, status: "connected" });
    }
    this.bind(member, conn);
    return { ok: true, snapshot: this.snapshot(member.id) };
  }

  /** Salida voluntaria: libera el alias al instante. El transporte cierra el socket. */
  leave(conn: ConnectionId): void {
    const member = this.byConn.get(conn);
    if (member) this.remove(member, "leave");
  }

  /** Caída del socket: el participante pasa a `reconnecting` durante la gracia. */
  disconnect(conn: ConnectionId): void {
    this.strokeLimiters.delete(conn);
    const member = this.byConn.get(conn);
    if (!member) return; // sin unirse, o ya sustituido por un `resume`
    this.unbind(member);
    member.status = "reconnecting";
    this.broadcast("presence:status", { participantId: member.id, status: "reconnecting" });
    member.graceTimer = setTimeout(() => {
      member.graceTimer = null;
      this.remove(member, "timeout");
    }, this.limits.graceMs);
    member.graceTimer.unref();
  }

  /** Cancela temporizadores (cierre del servidor). */
  close(): void {
    for (const m of this.members.values()) this.clearGrace(m);
  }

  // ---- Trazos --------------------------------------------------------------

  strokeStart(conn: ConnectionId, p: StrokeStartPayload): Result {
    const member = this.byConn.get(conn);
    if (!member) return fail("NOT_JOINED", "Debes unirte primero");
    if (member.openStrokeId !== null) return fail("STROKE_LIMIT", "Ya tienes un trazo abierto");
    if (this.strokeById.has(p.id)) return fail("STROKE_INVALID", "El id del trazo ya existe");
    if (
      this.strokes.length >= this.limits.maxStrokes ||
      this.totalPoints + p.points.length > this.limits.maxTotalPoints
    ) {
      return fail("BOARD_FULL", "La pizarra está llena");
    }

    const stroke: Stroke = {
      id: p.id,
      authorId: member.id,
      tool: p.tool,
      color: p.color,
      width: p.width,
      points: p.points.map((pt) => [pt[0], pt[1]]),
      open: true,
    };
    this.strokes.push(stroke);
    this.strokeById.set(stroke.id, stroke);
    this.totalPoints += stroke.points.length;
    member.openStrokeId = stroke.id;
    this.strokeEvent(member, "stroke:started", { stroke: cloneStroke(stroke) });
    return { ok: true };
  }

  strokePoints(conn: ConnectionId, p: StrokePointsPayload): Result {
    const member = this.byConn.get(conn);
    if (!member) return fail("NOT_JOINED", "Debes unirte primero");
    const stroke = this.ownOpenStroke(member, p.id);
    if (!stroke) return fail("STROKE_INVALID", "El trazo no existe, está cerrado o no es tuyo");

    if (stroke.points.length + p.points.length > this.limits.maxPointsPerStroke) {
      this.closeStroke(member);
      return fail("STROKE_INVALID", "El trazo supera el máximo de puntos");
    }
    if (this.totalPoints + p.points.length > this.limits.maxTotalPoints) {
      this.closeStroke(member);
      return fail("BOARD_FULL", "La pizarra está llena");
    }

    for (const pt of p.points) stroke.points.push([pt[0], pt[1]]);
    this.totalPoints += p.points.length;
    this.strokeEvent(member, "stroke:appended", { id: stroke.id, points: p.points.map((pt) => [pt[0], pt[1]]) });
    return { ok: true };
  }

  strokeEnd(conn: ConnectionId, p: StrokeEndPayload): Result {
    const member = this.byConn.get(conn);
    if (!member) return fail("NOT_JOINED", "Debes unirte primero");
    if (!this.ownOpenStroke(member, p.id)) {
      return fail("STROKE_INVALID", "El trazo no existe, está cerrado o no es tuyo");
    }
    this.closeStroke(member);
    return { ok: true };
  }

  // ---- Chat ----------------------------------------------------------------

  chatSend(conn: ConnectionId, p: ChatSendPayload): Result {
    const member = this.byConn.get(conn);
    if (!member) return fail("NOT_JOINED", "Debes unirte primero");
    const message: ChatMessage = {
      id: randomUUID(),
      authorId: member.id,
      alias: member.alias,
      text: p.text,
      ts: this.now(),
    };
    this.chat.push(message);
    if (this.chat.length > this.limits.chatHistory) this.chat.shift();
    this.broadcast("chat:message", { message: { ...message } });
    return { ok: true };
  }

  // ---- Internos ------------------------------------------------------------

  private newId(): string {
    let id: string;
    do id = randomBytes(6).toString("base64url");
    while (this.members.has(id));
    return id;
  }

  private bind(member: Member, conn: ConnectionId): void {
    member.conn = conn;
    this.byConn.set(conn, member);
  }

  private unbind(member: Member): void {
    if (member.conn !== null) this.byConn.delete(member.conn);
    member.conn = null;
  }

  private clearGrace(member: Member): void {
    if (member.graceTimer) clearTimeout(member.graceTimer);
    member.graceTimer = null;
  }

  private toParticipant(m: Member): Participant {
    return { id: m.id, alias: m.alias, status: m.status };
  }

  private ownOpenStroke(member: Member, id: string): Stroke | undefined {
    const stroke = this.strokeById.get(id);
    return stroke && stroke.open && stroke.authorId === member.id ? stroke : undefined;
  }

  /** Cierre de un trazo abierto del miembro: difunde `stroke:ended` con `seq` nuevo (A4). */
  private closeStroke(member: Member): void {
    const stroke = member.openStrokeId ? this.strokeById.get(member.openStrokeId) : undefined;
    member.openStrokeId = null;
    if (!stroke) return;
    stroke.open = false;
    this.strokeEvent(member, "stroke:ended", { id: stroke.id });
  }

  private remove(member: Member, reason: "leave" | "timeout"): void {
    this.unbind(member);
    this.clearGrace(member);
    this.closeStroke(member);
    this.members.delete(member.id);
    this.byToken.delete(member.token);
    this.broadcast("presence:left", { participantId: member.id, reason });
  }

  private snapshot(selfId: string): Snapshot {
    return {
      protocol: PROTOCOL_VERSION,
      epoch: this.epoch,
      seq: this.seq,
      selfId,
      participants: [...this.members.values()].map((m) => this.toParticipant(m)),
      strokes: this.strokes.map(cloneStroke),
      chat: this.chat.map((c) => ({ ...c })),
    };
  }

  /** Asigna el siguiente `seq` y entrega a todos los participantes vinculados salvo `exceptId`. */
  private broadcast<E extends ServerEventName>(
    event: E,
    body: Omit<ServerEventPayloads[E], "seq">,
    exceptId?: string,
  ): number {
    const seq = ++this.seq;
    const payload = { seq, ...body } as ServerEventPayloads[E];
    for (const m of this.members.values()) {
      if (m.conn !== null && m.id !== exceptId) this.outbox.send(m.conn, event, payload);
    }
    return seq;
  }

  /** Evento de trazo: a todos menos al autor, que recibe `seq:advance` con el mismo `seq`. */
  private strokeEvent<E extends "stroke:started" | "stroke:appended" | "stroke:ended">(
    author: Member,
    event: E,
    body: Omit<ServerEventPayloads[E], "seq">,
  ): void {
    const seq = this.broadcast(event, body, author.id);
    if (author.conn !== null) this.outbox.send(author.conn, "seq:advance", { seq });
  }
}
