import { describe, expect, it } from "vitest";
import { backingSize, fitCanvas, toLogical, toPixel, widthToPixels } from "../src/coords";

// AC-4
describe("coords", () => {
  it.each([
    [320, 180],
    [800, 450],
    [1000, 700],
    [500, 900],
  ])("ajusta 16:9 sin deformar en %ix%i", (w, h) => {
    const r = fitCanvas(w, h);
    expect(r.width / r.height).toBeCloseTo(16 / 9, 6);
    expect(r.offsetX).toBeCloseTo((w - r.width) / 2, 6);
    expect(r.offsetY).toBeCloseTo((h - r.height) / 2, 6);
    expect(r.width).toBeLessThanOrEqual(w + 1e-9);
    expect(r.height).toBeLessThanOrEqual(h + 1e-9);
  });

  it("hace letterbox: banda vertical en 1000x700, horizontal en 500x900", () => {
    const wide = fitCanvas(1000, 700);
    expect(wide.height).toBeCloseTo(562.5, 6);
    expect(wide.offsetY).toBeGreaterThan(0);
    const tall = fitCanvas(500, 900);
    expect(tall.width).toBe(500);
    expect(tall.offsetX).toBe(0);
  });

  it("ida y vuelta lógico↔píxel mantiene el punto", () => {
    for (const [w, h] of [[320, 180], [800, 450], [1000, 700]] as const) {
      const r = fitCanvas(w, h);
      for (const p of [[0, 0], [1, 1], [0.5, 0.25], [0.1234, 0.9876]] as const) {
        const px = toPixel([p[0], p[1]], r);
        const back = toLogical(px.x, px.y, r);
        expect(back[0]).toBeCloseTo(p[0], 3);
        expect(back[1]).toBeCloseTo(p[1], 3);
      }
    }
  });

  it("el mismo punto lógico cae en la misma posición relativa en tamaños distintos", () => {
    const a = fitCanvas(320, 180);
    const b = fitCanvas(1000, 700);
    const pa = toPixel([0.25, 0.75], a);
    const pb = toPixel([0.25, 0.75], b);
    expect((pa.x - a.offsetX) / a.width).toBeCloseTo((pb.x - b.offsetX) / b.width, 9);
    expect((pa.y - a.offsetY) / a.height).toBeCloseTo((pb.y - b.offsetY) / b.height, 9);
  });

  it("acota a [0,1] los clics en la banda de letterbox", () => {
    const r = fitCanvas(1000, 700);
    expect(toLogical(0, 0, r)).toEqual([0, 0]);
    expect(toLogical(1000, 700, r)).toEqual([1, 1]);
  });

  it("escala el grosor con el ancho", () => {
    expect(widthToPixels(0.01, fitCanvas(800, 450))).toBeCloseTo(8, 6);
    expect(widthToPixels(0.01, fitCanvas(320, 180))).toBeCloseTo(3.2, 6);
  });

  it("calcula el búfer con devicePixelRatio 2", () => {
    expect(backingSize(800, 450, 2)).toEqual({ width: 1600, height: 900 });
    expect(backingSize(800, 450, 0)).toEqual({ width: 800, height: 450 });
  });

  it("contenedor vacío devuelve rectángulo vacío", () => {
    expect(fitCanvas(0, 100).width).toBe(0);
    expect(toLogical(5, 5, fitCanvas(0, 0))).toEqual([0, 0]);
  });
});
