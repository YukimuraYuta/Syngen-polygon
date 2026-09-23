import { Router } from "express";
import path from "path";
import fs from "fs";
import { paths } from "../config";
import { getImageCount, getLatestImages } from "../db/database";

const router = Router();

// Count endpoint - must be before /:filename
router.get("/count", (_req, res) => {
  const count = getImageCount();
  res.json({ count });
});

// Paginated latest images - must be before /:filename
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.get("/", (_req, _res, next) => {
  try {
    const limit = Math.min(parseInt(String(_req.query.limit ?? "10"), 10), 50);
    const offset = parseInt(String(_req.query.offset ?? "0"), 10);

    const images = getLatestImages(limit, offset);
    const total = getImageCount();

    const base = `/api/images/`;
    const result = images.map((img) => ({
      id: img.id,
      filename: img.filename,
      url: `${base}${img.filename}`,
      timestamp: img.timestamp,
    }));

    // Check if there are more pages by fetching one extra
    const extra = getLatestImages(limit + 1, offset);
    const hasMore = extra.length > limit;

    _res.json({
      images: result,
      total,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// Serve static image files - must be last
router.get("/:filename", (_req, res) => {
  const { filename } = _req.params;
  const imageDir = paths.images;
  const filePath = path.join(imageDir, filename);

  // Prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(imageDir);
  if (!resolvedPath.startsWith(resolvedDir)) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: "Image not found" });
  }

  res.sendFile(resolvedPath);
});

export default router;
