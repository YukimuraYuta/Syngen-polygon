import { Server } from "ws";
import { WebSocketServer } from "ws";
import type { WSMessage } from "../types";

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: import("http").Server) {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    console.log("[WS] Client connected");

    socket.on("close", () => {
      console.log("[WS] Client disconnected");
    });

    socket.on("error", (err) => {
      console.error("[WS] Socket error:", err);
    });
  });

  return wss;
}

export function broadcast(message: WSMessage) {
  if (!wss) {
    console.warn("[WS] No WebSocket server to broadcast to");
    return;
  }

  const data = JSON.stringify(message);
  let sentCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(data);
      sentCount++;
    }
  });

  if (sentCount > 0) {
    console.log(`[WS] Broadcast to ${sentCount} client(s):`, message.type);
  }
}

export function log(message: string) {
  broadcast({
    type: "log",
    data: message,
    timestamp: new Date().toISOString(),
  });
}

export function setStatus(running: boolean, jobId?: string) {
  broadcast({
    type: "status",
    running,
    jobId,
  });
}

export function notifyImageGenerated(count: number) {
  broadcast({
    type: "image_generated",
    count,
  });
}
