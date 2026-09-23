export type WSMessage =
  | { type: "log"; data: string; timestamp: string }
  | { type: "status"; running: boolean; jobId?: string }
  | { type: "image_generated"; count: number };

export interface UploadResponse {
  success: boolean;
  filename: string;
  size: number;
}

export interface StartWorkflowResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export interface StopWorkflowResponse {
  success: boolean;
  message: string;
}

export interface ImageInfo {
  id: string;
  filename: string;
  url: string;
  timestamp: string;
}

export interface ImagesResponse {
  images: ImageInfo[];
  total: number;
  hasMore: boolean;
}

export interface DRParams {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  lightIntensity: number;
  lightTemperature: number;
  cameraPosition: [number, number, number];
  materialColor: string;
}

export interface JobRecord {
  id: string;
  modelPath: string;
  modelFilename: string;
  outputDir: string;
  numViews: number;
  seed: number;
  status: "running" | "completed" | "stopped" | "failed";
  startedAt: string;
  completedAt?: string;
}

export interface ImageRecord {
  id: string;
  filename: string;
  path: string;
  jobId: string;
  viewNumber: number;
  timestamp: string;
}
