import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { paths } from "../config";
import { log } from "../services/websocket";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, paths.models);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".glb", ".gltf", ".obj", ".fbx", ".stl", ".ply"];
    cb(null, allowed.includes(ext));
  },
});

// Track the latest uploaded model path (in-memory; in production use DB)
let currentModelPath: string | null = null;

export function getCurrentModelPath(): string | null {
  return currentModelPath;
}

export function getCurrentModelFilename(): string | null {
  if (!currentModelPath) return null;
  return path.basename(currentModelPath);
}

router.post(
  "/upload",
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded or unsupported file type. Supported: .glb, .gltf, .obj, .fbx, .stl, .ply",
      });
    }

    const modelPath = path.join(paths.models, req.file.originalname);
    currentModelPath = modelPath;

    log(`Model uploaded: ${req.file.originalname} (${req.file.size} bytes)`);

    res.json({
      success: true,
      filename: req.file.originalname,
      size: req.file.size,
    });
  }
);

export default router;
