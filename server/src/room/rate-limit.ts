/** Limitador de ventana deslizante con reloj inyectable (los eventos aceptados cuentan). */
export class RateLimiter {
  private readonly hits: number[] = [];

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** `true` si el evento cabe en la ventana (y lo registra); `false` si debe descartarse. */
  allow(): boolean {
    const t = this.now();
    while (this.hits.length > 0 && t - this.hits[0]! >= this.windowMs) this.hits.shift();
    if (this.hits.length >= this.max) return false;
    this.hits.push(t);
    return true;
  }
}
