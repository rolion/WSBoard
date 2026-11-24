import { z } from "zod";
import {
  ALIAS_MAX,
  ALIAS_MIN,
  CHAT_MAX_CHARS,
  CHAT_MAX_NEWLINES,
  COORD_DECIMALS,
  MAX_POINTS_PER_BATCH,
  PROTOCOL_VERSION,
  STROKE_WIDTH_MAX,
  STROKE_WIDTH_MIN,
} from "./limits";

// ---- Alias -----------------------------------------------------------------

// Letras (con marcas combinantes), dígitos, `_`, `-`, `.`; al menos una letra o
// dígito; espacios simples solo entre palabras.
const ALIAS_PATTERN =
  /^(?=.*[\p{L}\p{N}])[\p{L}\p{N}\p{M}_.-]+(?: [\p{L}\p{N}\p{M}_.-]+)*$/u;

/** NFKC + recorte. No valida. */
export function normalizeAlias(raw: string): string {
  return raw.normalize("NFKC").trim();
}

/** Clave de unicidad: insensible a mayúsculas, sobre el alias normalizado. */
export function aliasKey(raw: string): string {
  return normalizeAlias(raw).toLowerCase();
}

export const aliasSchema = z
  .string()
  .transform(normalizeAlias)
  .refine(
    (a) => {
      const len = [...a].length;
      return len >= ALIAS_MIN && len <= ALIAS_MAX;
    },
    { message: `El alias debe tener entre ${ALIAS_MIN} y ${ALIAS_MAX} caracteres` },
  )
  .refine((a) => ALIAS_PATTERN.test(a), {
    message: "Solo letras, dígitos, espacio simple, _ - .",
  });

// ---- Primitivas del dibujo -------------------------------------------------

const roundCoord = (n: number) => {
  const f = 10 ** COORD_DECIMALS;
  return Math.round(n * f) / f;
};

const coord = z.number().finite().min(0).max(1).transform(roundCoord);

export const pointSchema = z.tuple([coord, coord]);

export const toolSchema = z.enum(["pen", "eraser"]);
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const widthSchema = z.number().finite().min(STROKE_WIDTH_MIN).max(STROKE_WIDTH_MAX);
export const strokeIdSchema = z.uuidv4();
const batchSchema = z.array(pointSchema).min(1).max(MAX_POINTS_PER_BATCH);

// ---- Chat ------------------------------------------------------------------

// Controles C0/C1 salvo \n, más los separadores de línea U+2028 y U+2029.
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u{2028}\u{2029}]/u;

export const chatTextSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length >= 1 && [...s].length <= CHAT_MAX_CHARS, {
    message: `El mensaje debe tener entre 1 y ${CHAT_MAX_CHARS} caracteres`,
  })
  .refine((s) => !CONTROL_EXCEPT_NEWLINE.test(s), {
    message: "Caracteres de control no permitidos",
  })
  .refine((s) => (s.match(/\n/g)?.length ?? 0) <= CHAT_MAX_NEWLINES, {
    message: `Máximo ${CHAT_MAX_NEWLINES} saltos de línea`,
  });

// ---- Eventos cliente → servidor (campos desconocidos se descartan) ---------

export const joinPayloadSchema = z.object({
  alias: aliasSchema,
  protocol: z.literal(PROTOCOL_VERSION),
});

export const resumePayloadSchema = z.object({
  sessionToken: z.string().min(1).max(128),
  lastSeq: z.number().int().min(0),
});

export const strokeStartPayloadSchema = z.object({
  id: strokeIdSchema,
  tool: toolSchema,
  color: colorSchema,
  width: widthSchema,
  points: batchSchema,
});

export const strokePointsPayloadSchema = z.object({
  id: strokeIdSchema,
  points: batchSchema,
});

export const strokeEndPayloadSchema = z.object({ id: strokeIdSchema });

export const chatSendPayloadSchema = z.object({ text: chatTextSchema });

export type JoinPayload = z.infer<typeof joinPayloadSchema>;
export type ResumePayload = z.infer<typeof resumePayloadSchema>;
export type StrokeStartPayload = z.infer<typeof strokeStartPayloadSchema>;
export type StrokePointsPayload = z.infer<typeof strokePointsPayloadSchema>;
export type StrokeEndPayload = z.infer<typeof strokeEndPayloadSchema>;
export type ChatSendPayload = z.infer<typeof chatSendPayloadSchema>;
