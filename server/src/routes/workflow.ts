import { Router } from "express";
import { isWorkflowRunning, startWorkflow, stopWorkflow, getCurrentJobId } from "../services/blender";
import { getCurrentModelPath } from "./upload";
import { log, setStatus } from "../services/websocket";
import { config } from "../config";

const router = Router();

router.post("/start", async (_req, res, next) => {
  try {
    if (isWorkflowRunning()) {
      return res.status(409).json({
        success: false,
        message: "A workflow is already running",
      });
    }

    const modelPath = getCurrentModelPath();
    if (!modelPath) {
      return res.status(400).json({
        success: false,
        message: "No 3D model has been uploaded. Upload a model first.",
      });
    }

    if (!require("fs").existsSync(modelPath)) {
      return res.status(404).json({
        success: false,
        message: `Model file not found: ${modelPath}`,
      });
    }

    const modelFilename = require("path").basename(modelPath);
    const jobId = await startWorkflow(modelPath, modelFilename, config.defaultNumViews);

    res.json({
      success: true,
      jobId,
      message: `Workflow started with ${config.defaultNumViews} views`,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/stop", (_req, res, next) => {
  try {
    if (!isWorkflowRunning()) {
      return res.status(409).json({
        success: false,
        message: "No workflow is currently running",
      });
    }

    const jobId = getCurrentJobId();
    void stopWorkflow();

    res.json({
      success: true,
      message: "Workflow stop signal sent",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/status", (_req, res) => {
  res.json({
    running: isWorkflowRunning(),
    jobId: getCurrentJobId(),
  });
});

export default router;
