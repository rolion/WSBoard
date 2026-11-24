import { CLIENT_EVENT_SCHEMAS, type ClientEventName } from "./events";
import type { ErrorCode } from "./errors";

export type ParseResult =
  | { ok: true; data: unknown }
  | { ok: false; code: ErrorCode; message: string };

const STROKE_EVENTS = new Set<string>(["stroke:start", "stroke:points", "stroke:end"]);

/**
 * Valida un payload C→S y, si falla, elige el código de error según el ADR de
 * ajustes (A2). El servidor no reimplementa este mapeo.
 */
export function parseClientEvent(event: ClientEventName | (string & {}), payload: unknown): ParseResult {
  if (event === "session:leave") return { ok: true, data: undefined };
  // `hasOwn` evita resolver nombres heredados de Object.prototype ("constructor", "__proto__").
  if (typeof event !== "string" || !Object.hasOwn(CLIENT_EVENT_SCHEMAS, event)) {
    return { ok: false, code: "PAYLOAD_INVALID", message: `Evento desconocido: ${String(event)}` };
  }
  const schema = CLIENT_EVENT_SCHEMAS[event as keyof typeof CLIENT_EVENT_SCHEMAS];

  const res = schema.safeParse(payload);
  if (res.success) return { ok: true, data: res.data };

  const message = res.error.issues[0]?.message ?? "Payload inválido";
  const roots = new Set(res.error.issues.map((i) => i.path[0]));
  let code: ErrorCode = "PAYLOAD_INVALID";
  if (event === "session:join") {
    if (roots.has("protocol")) code = "PROTOCOL_MISMATCH";
    else if (roots.has("alias")) code = "ALIAS_INVALID";
  } else if (STROKE_EVENTS.has(event)) code = "STROKE_INVALID";
  else if (event === "chat:send") code = "CHAT_INVALID";
  return { ok: false, code, message };
}
