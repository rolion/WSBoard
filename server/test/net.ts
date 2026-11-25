import { randomUUID } from "node:crypto";
import { afterEach } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type { JoinAck, Point, ResumeAck, ChatSendAck } from "@pw/shared";
import { createAppServer, type AppServer } from "../src/app";
import type { RoomOptions } from "../src/room/room";

const servers: AppServer[] = [];
const clients: Client[] = [];

afterEach(async () => {
  clients.splice(0).forEach((c) => c.socket.close());
  await Promise.all(servers.splice(0).map((s) => s.close()));
});

export async function startServer(roomOptions?: RoomOptions): Promise<{ app: AppServer; url: string }> {
  const app = createAppServer({ allowedOrigins: ["http://localhost:5173"] }, roomOptions);
  servers.push(app);
  const port = await app.listen(0);
  return { app, url: `http://127.0.0.1:${port}` };
}

export interface Logged {
  event: string;
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export class Client {
  readonly log: Logged[] = [];
  token = "";
  id = "";
  constructor(readonly socket: Socket) {
    socket.onAny((event: string, payload: unknown) => this.log.push({ event, payload }));
  }
  events(name: string): Logged[] {
    return this.log.filter((l) => l.event === name);
  }
  /** Eventos de difusión con `seq` (incluye `seq:advance`), en orden de llegada. */
  seqs(): number[] {
    return this.log.filter((l) => typeof l.payload?.seq === "number").map((l) => l.payload.seq as number);
  }
  join(alias: string, protocol: unknown = 1): Promise<JoinAck> {
    return new Promise((resolve) => {
      this.socket.emit("session:join", { alias, protocol }, (ack: JoinAck) => {
        if (ack.ok) {
          this.token = ack.sessionToken;
          this.id = ack.snapshot.selfId;
        }
        resolve(ack);
      });
    });
  }
  resume(sessionToken: string): Promise<ResumeAck> {
    return new Promise((resolve) => this.socket.emit("session:resume", { sessionToken }, resolve));
  }
  chat(text: unknown): Promise<ChatSendAck> {
    return new Promise((resolve) => this.socket.emit("chat:send", { text }, resolve));
  }
  emit(event: string, ...args: unknown[]): void {
    this.socket.emit(event, ...args);
  }
  closed(): Promise<void> {
    return this.socket.connected ? new Promise((r) => this.socket.once("disconnect", () => r())) : Promise.resolve();
  }
}

export async function newClient(url: string, alias?: string): Promise<Client> {
  const socket = connect(url, { transports: ["websocket"], reconnection: false });
  const client = new Client(socket);
  clients.push(client);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  if (alias) {
    const ack = await client.join(alias);
    if (!ack.ok) throw new Error(`join falló: ${ack.error.code}`);
  }
  return client;
}

/** Espera hasta que la condición (estado observable) se cumpla; sin esperas fijas. */
export async function until(cond: () => boolean, what = "condición", timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`Tiempo agotado esperando: ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

export const strokeBody = (n = 1, id: string = randomUUID()) => ({
  id,
  tool: "pen",
  color: "#112233",
  width: 0.01,
  points: Array.from({ length: n }, (_, i) => [i / 100, 0.5] as Point),
});
