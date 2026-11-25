import { RECONNECTING_MESSAGE } from "./alias-messages";
import type { SessionState } from "./session";

interface Props {
  state: SessionState;
  onLeave(): void;
}

/** Sala provisional hasta el layout (PW-003): pizarra, chat y participantes llegan después. */
export function RoomPlaceholder({ state, onLeave }: Props) {
  const reconnecting = state.link !== "connected";
  return (
    <section aria-labelledby="room-title" data-testid="room-screen">
      <h1 id="room-title">Sala principal</h1>
      <p>
        Conectado como <strong data-testid="self-alias">{state.alias}</strong>
      </p>
      <p role="status" data-testid="connection-indicator" data-reconnecting={reconnecting}>
        {reconnecting ? RECONNECTING_MESSAGE : "Conectado"}
      </p>
      <button type="button" onClick={onLeave}>
        Salir
      </button>
    </section>
  );
}
