import "dotenv/config";
import path from "path";
import fs from "fs";

export const config = {
  port: parseInt(process.env.PORT || "8000", 10),
  outputDir: path.resolve(process.env.OUTPUT_DIR || path.join(__dirname, "..", "..", "output")),
  blenderPath: process.env.BLENDER_PATH || "blender",
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || "1", 10),
  imageWidth: parseInt(process.env.IMAGE_WIDTH || "800", 10),
  imageHeight: parseInt(process.env.IMAGE_HEIGHT || "600", 10),
  renderDevice: process.env.RENDER_DEVICE || "CPU",
  cyclesSamples: parseInt(process.env.CYCLES_SAMPLES || "32", 10),
  defaultNumViews: 100,
} as const;

export const paths = {
  models: path.join(config.outputDir, "models"),
  images: path.join(config.outputDir, "images"),
  masks: path.join(config.outputDir, "masks"),
  depth: path.join(config.outputDir, "depth"),
  annotations: path.join(config.outputDir, "annotations"),
  scripts: path.join(__dirname, "..", "scripts"),
  db: path.join(config.outputDir, "database.json"),
} as const;

export function ensureDirectories() {
  for (const dir of [paths.models, paths.images, paths.masks, paths.depth, paths.annotations]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
