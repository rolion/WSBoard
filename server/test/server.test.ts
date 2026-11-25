import { afterEach, describe, expect, it } from "vitest";
import { createAppServer, type AppServer } from "../src/app";

const servers: AppServer[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => s.close()));
});

function make(): AppServer {
  const app = createAppServer({ allowedOrigins: ["http://localhost:5173"] });
  servers.push(app);
  return app;
}

describe("arranque", () => {
  it("escucha y responde /health", async () => {
    const app = make();
    const port = await app.listen(0);
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect((await fetch(`http://127.0.0.1:${port}/otra`)).status).toBe(404);
  });

  it("falla con EADDRINUSE si el puerto está ocupado", async () => {
    const first = make();
    const port = await first.listen(0);
    const second = createAppServer({ allowedOrigins: [] });
    await expect(second.listen(port)).rejects.toMatchObject({ code: "EADDRINUSE" });
    second.httpServer.close();
  });
});
