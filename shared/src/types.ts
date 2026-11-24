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

export interface Snapshot {
  protocol: typeof PROTOCOL_VERSION;
  epoch: string;
  seq: number;
  selfId: ParticipantId;
  participants: Participant[];
  strokes: Stroke[];
  chat: ChatMessage[];
}
