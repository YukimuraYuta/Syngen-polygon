import http from "http";
import { app } from "./app";
import { initWebSocketServer } from "./services/websocket";
import { config } from "./config";
import { initDb } from "./db/database";

// Initialize database
initDb();

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);
console.log("[WS] WebSocket server initialized on /ws");

// Start server
server.listen(config.port, () => {
  console.log(`[SERVER] SynGen Polygon backend listening on http://localhost:${config.port}`);
  console.log(`[SERVER] Health check: http://localhost:${config.port}/health`);
});
