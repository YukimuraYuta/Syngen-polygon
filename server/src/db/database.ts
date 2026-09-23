import fs from "fs";
import path from "path";
import { config, paths } from "../config";
import { JobRecord, ImageRecord } from "../types";

interface Database {
  jobs: Record<string, JobRecord>;
  images: ImageRecord[];
}

let db: Database | null = null;
let dbPath: string;

function getDbPath(): string {
  if (!dbPath) {
    dbPath = path.join(config.outputDir, "database.json");
  }
  return dbPath;
}

function loadDb(): Database {
  const dbFile = getDbPath();
  if (fs.existsSync(dbFile)) {
    const data = fs.readFileSync(dbFile, "utf-8");
    try {
      return JSON.parse(data) as Database;
    } catch {
      console.warn("[DB] Corrupted database file, starting fresh");
    }
  }
  return { jobs: {}, images: [] };
}

function saveDb(data: Database): void {
  const dbFile = getDbPath();
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf-8");
}

export function getDb(): Database {
  if (!db) {
    db = loadDb();
  }
  return db;
}

export function initDb(): void {
  if (!db) {
    db = loadDb();
  }
  console.log("[DB] JSON file database initialized at", getDbPath());
}

export function insertJob(job: JobRecord): void {
  const database = getDb();
  database.jobs[job.id] = job;
  saveDb(database);
}

export function updateJobStatus(
  jobId: string,
  status: JobRecord["status"],
  completedAt?: string
): void {
  const database = getDb();
  if (database.jobs[jobId]) {
    database.jobs[jobId].status = status;
    if (completedAt) {
      database.jobs[jobId].completedAt = completedAt;
    }
    saveDb(database);
  }
}

export function getJob(jobId: string): JobRecord | undefined {
  const database = getDb();
  return database.jobs[jobId];
}

export function insertImageRecord(image: ImageRecord): void {
  const database = getDb();
  database.images.push(image);
  saveDb(database);
}

export function getImageCount(): number {
  const database = getDb();
  return database.images.length;
}

export function getLatestImages(limit: number, offset: number): ImageRecord[] {
  const database = getDb();
  // Images are appended in order; latest are at the end
  const sorted = [...database.images].reverse();
  return sorted.slice(offset, offset + limit);
}
