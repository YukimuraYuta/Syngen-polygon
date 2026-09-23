import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";
import { config, paths } from "../config";
import { generateDRParams } from "./randomization";
import { insertJob, insertImageRecord, updateJobStatus, getJob } from "../db/database";
import { log, setStatus, notifyImageGenerated } from "./websocket";
import type { WSMessage } from "../types";
import type { DRParams, JobRecord, ImageRecord } from "../types";

interface ActiveJob {
  jobId: string;
  process: ChildProcessWithoutNullStreams;
  modelPath: string;
  outputDir: string;
}

let activeJob: ActiveJob | null = null;

function parseStdoutLine(line: string): WSMessage | null {
  try {
    const msg = JSON.parse(line.trim());
    if (msg.event && typeof msg.data === "string") {
      return { type: "log", data: msg.data, timestamp: msg.timestamp || new Date().toISOString() };
    }
    if (msg.event === "image_generated" && typeof msg.count === "number") {
      return { type: "image_generated", count: msg.count };
    }
    if (msg.event === "status") {
      return { type: "status", running: msg.running, jobId: msg.jobId };
    }
  } catch {
    // Not JSON - treat as plain text log line
    if (line.trim()) {
      return { type: "log", data: line.trim(), timestamp: new Date().toISOString() };
    }
  }
  return null;
}

function broadcastMessage(msg: WSMessage) {
  // Re-broadcast to all WS clients (not just logging locally)
  const { broadcast } = require("./websocket");
  broadcast(msg);
}

export function isWorkflowRunning(): boolean {
  return activeJob !== null;
}

export function getCurrentJobId(): string | null {
  return activeJob?.jobId ?? null;
}

export async function startWorkflow(modelPath: string, modelFilename: string, numViews: number = config.defaultNumViews): Promise<string> {
  if (activeJob) {
    throw new Error("A workflow is already running");
  }

  const jobId = `job_${Date.now()}`;
  const outputDir = path.join(config.outputDir, "runs", jobId);
  fs.mkdirSync(outputDir, { recursive: true });

  // Generate domain randomization parameters
  const seed = Date.now();
  const drParams = generateDRParams(numViews, seed);

  // Save DR params for the Blender script to consume
  const drParamsPath = path.join(outputDir, "dr_params.json");
  fs.writeFileSync(drParamsPath, JSON.stringify(drParams, null, 2));

  // Save job record to database
  const job: JobRecord = {
    id: jobId,
    modelPath,
    modelFilename,
    outputDir,
    numViews,
    seed,
    status: "running",
    startedAt: new Date().toISOString(),
  };
  insertJob(job);

  // Build Blender command
  const scriptPath = path.join(paths.scripts, "render.py");
  const args = [
    "--background",
    "--python", scriptPath,
    "--",
    "--model", modelPath,
    "--output", outputDir,
    "--num-views", String(numViews),
    "--seed", String(seed),
    "--job-id", jobId,
    "--dr-params", drParamsPath,
    "--width", String(config.imageWidth),
    "--height", String(config.imageHeight),
    "--device", config.renderDevice,
    "--samples", String(config.cyclesSamples),
  ];

  log(`Starting Blender render: ${config.blenderPath} ${args.join(" ")}`);
  setStatus(true, jobId);

  const proc = spawn(config.blenderPath, args, {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: outputDir,
  });

  activeJob = {
    jobId,
    process: proc,
    modelPath,
    outputDir,
  };

  let imageCount = 0;

  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (data: string) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;

      const msg = parseStdoutLine(line);
      if (msg) {
        broadcastMessage(msg);
        if (msg.type === "image_generated") {
          imageCount = msg.count;
          insertImageRecord({
            id: `${jobId}_${msg.count}`,
            filename: `img_${jobId}_${msg.count}.png`,
            path: path.join(outputDir, "images", `img_${jobId}_${msg.count}.png`),
            jobId,
            viewNumber: msg.count,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  });

  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", (data: string) => {
    const msg: WSMessage = {
      type: "log",
      data: `[Blender ERROR] ${data.toString().trim()}`,
      timestamp: new Date().toISOString(),
    };
    broadcastMessage(msg);
  });

  proc.on("error", (err) => {
    log(`Failed to start Blender: ${err.message}`);
    updateJobStatus(jobId, "failed");
    setStatus(false, jobId);
    activeJob = null;
  });

  proc.on("close", (code: number | null) => {
    if (code === 0) {
      log(`Blender process completed successfully`);
      updateJobStatus(jobId, "completed", new Date().toISOString());
    } else {
      log(`Blender process exited with code ${code}`);
      updateJobStatus(jobId, code === null ? "stopped" : "failed");
    }
    setStatus(false, jobId);
    activeJob = null;
  });

  return jobId;
}

export async function stopWorkflow(): Promise<void> {
  if (!activeJob) {
    throw new Error("No workflow is currently running");
  }

  const { jobId, process } = activeJob;

  log(`Stopping workflow ${jobId}...`);

  try {
    process.kill("SIGTERM");
  } catch {
    // Process may have already exited
  }

  // Give it a moment to shut down gracefully
  setTimeout(() => {
    try {
      process.kill("SIGKILL");
    } catch {
      // Already dead
    }
  }, 5000);

  // The close event handler will update job status and broadcast
}

export { activeJob };
