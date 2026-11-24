import type { ErrorCode } from "./errors";
import type { PROTOCOL_VERSION } from "./limits";

export type Alias = string;
export type ParticipantId = string;
export type StrokeId = string;
/** [x, y] normalizados en [0, 1]. */
export type Point = [x: number, y: number];
export type Tool = "pen" | "eraser";
export type ParticipantStatus = "connected" | "reconnecting";

export interface Participant {
  id: ParticipantId;
  alias: Alias;
  status: ParticipantStatus;
}

export interface Stroke {
  id: StrokeId;
  authorId: ParticipantId;
  tool: Tool;
  color: string;
  /** Fracción del ancho lógico. */
  width: number;
  points: Point[];
  open: boolean;
}

export interface ChatMessage {
  id: string;
  authorId: ParticipantId;
  alias: Alias;
  text: string;
  ts: number;
}

/** Payloads de difusión S→C (ADR de contrato). Todos llevan `seq`. */
export interface PresenceJoinedPayload { seq: number; participant: Participant }
export interface PresenceStatusPayload { seq: number; participantId: ParticipantId; status: ParticipantStatus }
export interface PresenceLeftPayload {
  seq: number;
  participantId: ParticipantId;
  reason: "leave" | "timeout" | "replaced";
}
export interface StrokeStartedPayload { seq: number; stroke: Stroke }
export interface StrokeAppendedPayload { seq: number; id: StrokeId; points: Point[] }
export interface StrokeEndedPayload { seq: number; id: StrokeId }
export interface ChatMessagePayload { seq: number; message: ChatMessage }
/** Solo al autor de un evento de trazo, para avanzar `lastSeq` sin huecos. */
export interface SeqAdvancePayload { seq: number }

export interface ServerEventPayloads {
  "presence:joined": PresenceJoinedPayload;
  "presence:status": PresenceStatusPayload;
  "presence:left": PresenceLeftPayload;
  "stroke:started": StrokeStartedPayload;
  "stroke:appended": StrokeAppendedPayload;
  "stroke:ended": StrokeEndedPayload;
  "chat:message": ChatMessagePayload;
  "seq:advance": SeqAdvancePayload;
}

/** Respuesta de acknowledgement: `{ ok: true, ... }` o `{ ok: false, error }`. */
export type AckError = { ok: false; error: { code: ErrorCode; message: string } };
export type JoinAck = { ok: true; sessionToken: string; snapshot: Snapshot } | AckError;
export type ResumeAck = { ok: true; snapshot: Snapshot } | AckError;
export type ChatSendAck = { ok: true } | AckError;

export interface Snapshot {
  protocol: typeof PROTOCOL_VERSION;
  epoch: string;
  seq: number;
  selfId: ParticipantId;
  participants: Participant[];
  strokes: Stroke[];
  chat: ChatMessage[];
}
