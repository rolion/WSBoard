import { useEffect, useState, useSyncExternalStore } from "react";
import { getServerUrl } from "./config";
import { createConnectionController, createSocket, type ConnectionStatus } from "./connection";

const LABELS: Record<ConnectionStatus, string> = {
  disconnected: "Desconectado",
  connecting: "Conectando…",
  connected: "Conectado",
  error: "No se pudo conectar al servidor",
};

export function App() {
  const [serverUrl] = useState(() => getServerUrl(import.meta.env));
  const [controller] = useState(() => createConnectionController(createSocket(serverUrl)));
  useEffect(() => {
    controller.attach();
    return () => controller.detach();
  }, [controller]);

  const status = useSyncExternalStore(controller.subscribe, controller.getStatus);
  const active = status === "connecting" || status === "connected";

  return (
    <main>
      <h1>Port Webhook</h1>
      <p>
        Servidor: <code>{serverUrl}</code>
      </p>
      <p role="status" data-testid="connection-status" data-status={status}>
        {LABELS[status]}
      </p>
      <button type="button" onClick={() => controller.connect()} disabled={active}>
        Conectar
      </button>{" "}
      <button type="button" onClick={() => controller.disconnect()} disabled={!active}>
        Desconectar
      </button>
    </main>
  );
}
