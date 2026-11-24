import { COORD_DECIMALS, LOGICAL_ASPECT } from "./limits";
import type { Point } from "./types";

/** Rectángulo (en px CSS) que ocupa el lienzo lógico 16:9 dentro de un contenedor. */
export interface CanvasRect {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** Ajusta el lienzo 16:9 al contenedor con letterbox, sin deformar. */
export function fitCanvas(containerWidth: number, containerHeight: number): CanvasRect {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { offsetX: 0, offsetY: 0, width: 0, height: 0 };
  }
  let width = containerWidth;
  let height = width / LOGICAL_ASPECT;
  if (height > containerHeight) {
    height = containerHeight;
    width = height * LOGICAL_ASPECT;
  }
  return {
    offsetX: (containerWidth - width) / 2,
    offsetY: (containerHeight - height) / 2,
    width,
    height,
  };
}

/** Punto lógico → px CSS dentro del contenedor. */
export function toPixel(p: Point, rect: CanvasRect): { x: number; y: number } {
  return { x: rect.offsetX + p[0] * rect.width, y: rect.offsetY + p[1] * rect.height };
}

/** px CSS dentro del contenedor → punto lógico, acotado a [0, 1] y redondeado. */
export function toLogical(x: number, y: number, rect: CanvasRect): Point {
  if (rect.width === 0 || rect.height === 0) return [0, 0];
  const f = 10 ** COORD_DECIMALS;
  const clamp = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * f) / f;
  return [clamp((x - rect.offsetX) / rect.width), clamp((y - rect.offsetY) / rect.height)];
}

/** Grosor lógico (fracción del ancho) → px CSS. */
export function widthToPixels(width: number, rect: CanvasRect): number {
  return width * rect.width;
}

/** Tamaño del búfer del `<canvas>` para un tamaño CSS y un devicePixelRatio. */
export function backingSize(cssWidth: number, cssHeight: number, dpr: number) {
  const r = dpr > 0 ? dpr : 1;
  return { width: Math.round(cssWidth * r), height: Math.round(cssHeight * r) };
}
