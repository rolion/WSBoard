// Valores normativos: ADR-pw-000-definicion-mvp-contrato-eventos (tabla de límites).
export const PROTOCOL_VERSION = 1 as const;
export const ROOM_ID = "main" as const;

export const MAX_PARTICIPANTS = 30;
export const ALIAS_MIN = 2;
export const ALIAS_MAX = 20;
export const MAX_MESSAGE_BYTES = 16_384;
export const MAX_POINTS_PER_BATCH = 64;
export const MAX_POINTS_PER_STROKE = 5_000;
export const MAX_STROKES = 5_000;
/** Suma de puntos de todos los trazos de la sala (cota del snapshot). */
export const MAX_TOTAL_POINTS = 500_000;
export const STROKE_WIDTH_MIN = 0.001;
export const STROKE_WIDTH_MAX = 0.05;
export const MAX_OPEN_STROKES_PER_PARTICIPANT = 1;
export const CHAT_MAX_CHARS = 500;
export const CHAT_MAX_NEWLINES = 5;
export const CHAT_HISTORY = 200;
/** Eventos `stroke:*` por segundo y socket. */
export const RATE_STROKE_EVENTS = 60;
/** Mensajes de chat permitidos por ventana y participante. */
export const RATE_CHAT = { messages: 5, windowMs: 10_000 } as const;
export const RECONNECT_GRACE_MS = 30_000;

/** Lienzo lógico 16:9; x e y normalizados en [0, 1]. */
export const LOGICAL_ASPECT = 16 / 9;
export const COORD_DECIMALS = 4;
