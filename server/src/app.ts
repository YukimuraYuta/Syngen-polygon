import express from "express";
import cors from "cors";
import path from "path";
import { config, ensureDirectories } from "./config";
import uploadRouter from "./routes/upload";
import workflowRouter from "./routes/workflow";
import imagesRouter from "./routes/images";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure output directories exist
ensureDirectories();

// Serve static files from output directory
app.use("/output", express.static(config.outputDir));

// API routes
app.use("/api", uploadRouter);
app.use("/api/workflow", workflowRouter);
app.use("/api/images", imagesRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use(errorHandler);

export { app };
