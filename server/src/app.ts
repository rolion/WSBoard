import { createServer, type Server as HttpServer } from "node:http";
import { Server as IoServer } from "socket.io";
import { MAX_MESSAGE_BYTES } from "@pw/shared";
import type { ServerConfig } from "./config";

export interface AppServer {
  httpServer: HttpServer;
  io: IoServer;
  listen(port: number): Promise<number>;
  close(): Promise<void>;
}

export function createAppServer(config: Pick<ServerConfig, "allowedOrigins">): AppServer {
  const httpServer = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    res.writeHead(404).end();
  });

  const io = new IoServer(httpServer, {
    transports: ["websocket"],
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
    // Navegadores siempre envían Origin; clientes sin Origin (herramientas, pruebas) se aceptan.
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      callback(null, origin === undefined || config.allowedOrigins.includes(origin));
    },
  });

  return {
    httpServer,
    io,
    listen(port) {
      return new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, () => {
          httpServer.off("error", reject);
          const address = httpServer.address();
          resolve(typeof address === "object" && address ? address.port : port);
        });
      });
    },
    close() {
      return new Promise((resolve) => {
        void io.close(() => resolve());
      });
    },
  };
}
