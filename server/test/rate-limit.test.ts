import { describe, expect, it } from "vitest";
import { RateLimiter } from "../src/room/rate-limit";

describe("RateLimiter", () => {
  it("permite hasta max por ventana y vuelve a permitir al deslizar", () => {
    let t = 0;
    const l = new RateLimiter(3, 1000, () => t);
    expect([l.allow(), l.allow(), l.allow(), l.allow()]).toEqual([true, true, true, false]);
    t = 999;
    expect(l.allow()).toBe(false);
    t = 1000;
    expect(l.allow()).toBe(true);
  });
});
