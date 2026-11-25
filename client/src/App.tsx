import { useEffect, useState, useSyncExternalStore } from "react";
import { getServerUrl } from "./config";
import { createSocket } from "./connection";
import { createSessionController, type TokenStore } from "./session";
import { EntryScreen } from "./EntryScreen";
import { RoomPlaceholder } from "./RoomPlaceholder";

/** `sessionStorage` puede no existir o lanzar al accederse (datos bloqueados). */
function sessionTokenStore(): TokenStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function App() {
  const [controller] = useState(() =>
    createSessionController(createSocket(getServerUrl(import.meta.env)), { store: sessionTokenStore() }),
  );
  useEffect(() => {
    controller.attach();
    return () => controller.detach();
  }, [controller]);

  const state = useSyncExternalStore(controller.subscribe, controller.getState);

  return (
    <main className="app">
      {state.screen === "room" ? (
        <RoomPlaceholder state={state} onLeave={() => controller.leave()} />
      ) : (
        <EntryScreen state={state} onJoin={(alias) => controller.join(alias)} onRetry={() => controller.retry()} />
      )}
    </main>
  );
}
