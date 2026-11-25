import { afterEach, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import { MAX_MESSAGE_BYTES } from "@pw/shared";
import { createAppServer, type AppServer } from "../src/app";

const ORIGIN = "http://localhost:5173";
const servers: AppServer[] = [];
const sockets: Socket[] = [];

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.close());
  await Promise.all(servers.splice(0).map((s) => s.close()));
});

async function start(): Promise<{ app: AppServer; url: string }> {
  const app = createAppServer({ allowedOrigins: [ORIGIN] });
  servers.push(app);
  const port = await app.listen(0);
  return { app, url: `http://127.0.0.1:${port}` };
}

function client(url: string, origin?: string): Socket {
  const socket = connect(url, {
    transports: ["websocket"],
    reconnection: false,
    extraHeaders: origin ? { Origin: origin } : undefined,
  });
  sockets.push(socket);
  return socket;
}

const once = <T = void>(socket: Socket, event: string) => new Promise<T>((r) => socket.once(event, r));

describe("conexión WebSocket", () => {
  it("conecta por websocket, desconecta y el servidor lo ve", async () => {
    const { app, url } = await start();
    const serverSaw = new Promise<string>((resolve) =>
      app.io.on("connection", (s) => s.on("disconnect", resolve)),
    );
    const socket = client(url);
    await once(socket, "connect");
    expect(socket.io.engine.transport.name).toBe("websocket");
    expect(app.io.engine.clientsCount).toBe(1);
    socket.disconnect();
    expect(await serverSaw).toBe("client namespace disconnect");
  });

  it("acepta un Origin permitido", async () => {
    const { url } = await start();
    const socket = client(url, ORIGIN);
    await once(socket, "connect");
    expect(socket.connected).toBe(true);
  });

  it("rechaza un Origin no listado", async () => {
    const { url } = await start();
    const socket = client(url, "http://evil.test");
    const error = await once<Error>(socket, "connect_error");
    expect(error).toBeInstanceOf(Error);
    expect(socket.connected).toBe(false);
  });

  it("maxHttpBufferSize es MAX_MESSAGE_BYTES y un mensaje mayor cierra la conexión", async () => {
    const { app, url } = await start();
    expect(app.io.engine.opts.maxHttpBufferSize).toBe(MAX_MESSAGE_BYTES);
    const socket = client(url);
    await once(socket, "connect");
    const closed = once<string>(socket, "disconnect");
    socket.emit("test", "x".repeat(MAX_MESSAGE_BYTES + 1));
    expect(await closed).toBeTypeOf("string");
    expect(socket.connected).toBe(false);
  });

  it("un mensaje dentro del límite no cierra la conexión", async () => {
    const { url } = await start();
    const socket = client(url);
    await once(socket, "connect");
    socket.emit("test", "x".repeat(1000));
    await new Promise((r) => setTimeout(r, 100));
    expect(socket.connected).toBe(true);
  });
});
