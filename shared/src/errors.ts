// Códigos del evento `error` (ADR de contrato). `SESSION_EXPIRED` implementa la
// política de reinicio: tras reiniciar el servidor todo token queda inválido.
export const ERROR_CODES = [
  "NOT_JOINED",
  "PROTOCOL_MISMATCH",
  "ALIAS_INVALID",
  "ALIAS_TAKEN",
  "ROOM_FULL",
  "ALREADY_JOINED",
  "SESSION_EXPIRED",
  "STROKE_INVALID",
  "STROKE_LIMIT",
  "BOARD_FULL",
  "CHAT_INVALID",
  "RATE_LIMITED",
  "PAYLOAD_INVALID",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  ref?: string;
}
