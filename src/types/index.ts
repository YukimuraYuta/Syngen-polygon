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

export interface WorkflowStatusResponse {
  running: boolean;
  jobId: string | null;
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
