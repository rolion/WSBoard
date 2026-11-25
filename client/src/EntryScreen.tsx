import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CONNECTING_MESSAGE,
  SESSION_EXPIRED_NOTICE,
  entryErrorMessage,
} from "./alias-messages";
import type { SessionState } from "./session";

interface Props {
  state: SessionState;
  onJoin(alias: string): void;
  onRetry(): void;
}

export function EntryScreen({ state, onJoin, onRetry }: Props) {
  const [alias, setAlias] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const connected = state.link === "connected";

  // Foco al campo al quedar listo y, tras un error, con el texto seleccionado para reintentar.
  useEffect(() => {
    if (connected && !state.submitting) {
      input.current?.focus();
      if (state.error) input.current?.select();
    }
  }, [connected, state.submitting, state.error]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onJoin(alias);
  };

  return (
    <section aria-labelledby="entry-title" data-testid="entry-screen">
      <h1 id="entry-title">Port Webhook</h1>

      {state.notice === "session-expired" && (
        <p role="status" className="notice" data-testid="session-notice">
          {SESSION_EXPIRED_NOTICE}
        </p>
      )}

      <form onSubmit={submit} noValidate>
        <label htmlFor="alias">Tu nombre</label>
        <input
          id="alias"
          ref={input}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          autoComplete="off"
          disabled={!connected}
          readOnly={state.submitting}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "alias-help alias-error" : "alias-help"}
        />
        <p id="alias-help" className="help">
          2 a 20 caracteres: letras, números, espacios, _ - .
        </p>

        {state.error && (
          <p id="alias-error" role="alert" className="error" data-testid="alias-error">
            {entryErrorMessage(state.error)}
          </p>
        )}

        <button type="submit" disabled={!connected || state.submitting}>
          {state.submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>

      {state.link === "connecting" && (
        <p role="status" data-testid="connection-status">
          {CONNECTING_MESSAGE}
        </p>
      )}
      {state.link === "offline" && (
        <div role="alert" data-testid="connection-status">
          <p className="error">{entryErrorMessage("OFFLINE")}</p>
          <button type="button" onClick={onRetry}>
            Reintentar conexión
          </button>
        </div>
      )}
    </section>
  );
}
