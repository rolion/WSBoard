import type { z } from "zod";
import {
  chatSendPayloadSchema,
  joinPayloadSchema,
  resumePayloadSchema,
  strokeEndPayloadSchema,
  strokePointsPayloadSchema,
  strokeStartPayloadSchema,
} from "./schemas";

/** Eventos C→S con esquema de validación. `session:leave` no lleva payload. */
export const CLIENT_EVENT_SCHEMAS = {
  "session:join": joinPayloadSchema,
  "session:resume": resumePayloadSchema,
  "stroke:start": strokeStartPayloadSchema,
  "stroke:points": strokePointsPayloadSchema,
  "stroke:end": strokeEndPayloadSchema,
  "chat:send": chatSendPayloadSchema,
} as const satisfies Record<string, z.ZodType>;

export type ClientEventName = keyof typeof CLIENT_EVENT_SCHEMAS | "session:leave";
export const CLIENT_EVENTS: readonly ClientEventName[] = [
  ...(Object.keys(CLIENT_EVENT_SCHEMAS) as (keyof typeof CLIENT_EVENT_SCHEMAS)[]),
  "session:leave",
];

/** Eventos S→C de difusión; todos llevan `seq`. */
export const SERVER_EVENTS = [
  "presence:joined",
  "presence:status",
  "presence:left",
  "stroke:started",
  "stroke:appended",
  "stroke:ended",
  "chat:message",
  "seq:advance",
] as const;
export type ServerEventName = (typeof SERVER_EVENTS)[number];

/** Evento de error S→C, solo al emisor. */
export const ERROR_EVENT = "error" as const;
