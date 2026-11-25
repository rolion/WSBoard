import { randomUUID } from "node:crypto";
import type { JoinPayload, Point, ServerEventName, StrokeStartPayload } from "@pw/shared";
import type { Outbox } from "../src/room/outbox";
import { Room, type RoomOptions } from "../src/room/room";

export interface Sent {
  conn: string;
  event: ServerEventName;
  payload: { seq: number } & Record<string, unknown>;
}

export class FakeOutbox implements Outbox {
  sent: Sent[] = [];
  disconnected: string[] = [];
  send(conn: string, event: ServerEventName, payload: unknown): void {
    this.sent.push({ conn, event, payload: payload as Sent["payload"] });
  }
  disconnect(conn: string): void {
    this.disconnected.push(conn);
  }
  to(conn: string, event?: ServerEventName): Sent[] {
    return this.sent.filter((s) => s.conn === conn && (!event || s.event === event));
  }
}

export function makeRoom(options?: RoomOptions): { room: Room; out: FakeOutbox } {
  const out = new FakeOutbox();
  return { room: new Room(out, options), out };
}

export const join = (alias: string): JoinPayload => ({ alias, protocol: 1 });

/** Une un participante y devuelve su token e id. */
export function joined(room: Room, conn: string, alias: string) {
  const res = room.join(conn, join(alias));
  if (!res.ok) throw new Error(res.code);
  return { token: res.sessionToken, id: res.snapshot.selfId, snapshot: res.snapshot };
}

export const pts = (n: number, start = 0): Point[] =>
  Array.from({ length: n }, (_, i) => [((start + i) % 1000) / 1000, 0.5] as Point);

export const strokeStart = (n = 1, id: string = randomUUID()): StrokeStartPayload => ({
  id,
  tool: "pen",
  color: "#112233",
  width: 0.01,
  points: pts(n),
});
