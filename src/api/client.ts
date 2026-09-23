import type {
  UploadResponse,
  StartWorkflowResponse,
  StopWorkflowResponse,
  WorkflowStatusResponse,
  ImagesResponse,
  WSMessage,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE;
  }

  async uploadFile(file: File): Promise<UploadResponse> {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${this.baseUrl}/api/upload`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }

    return res.json();
  }

  async startWorkflow(): Promise<StartWorkflowResponse> {
    const res = await fetch(`${this.baseUrl}/api/workflow/start`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`Failed to start workflow: ${res.statusText}`);
    }

    return res.json();
  }

  async stopWorkflow(): Promise<StopWorkflowResponse> {
    const res = await fetch(`${this.baseUrl}/api/workflow/stop`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`Failed to stop workflow: ${res.statusText}`);
    }

    return res.json();
  }

  async getWorkflowStatus(): Promise<WorkflowStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/workflow/status`);

    if (!res.ok) {
      throw new Error(`Failed to fetch workflow status: ${res.statusText}`);
    }

    return res.json();
  }

  // Resolve a (possibly relative) image URL against the API origin so <img> tags
  // load from the backend instead of the frontend dev server.
  resolveImageUrl(url: string): string {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${this.baseUrl}${path}`;
  }

  async getImageCount(): Promise<number> {
    const res = await fetch(`${this.baseUrl}/api/images/count`);

    if (!res.ok) {
      throw new Error(`Failed to fetch image count: ${res.statusText}`);
    }

    const data: { count: number } = await res.json();
    return data.count;
  }

  async getImages(limit = 10, offset = 0): Promise<ImagesResponse> {
    const res = await fetch(
      `${this.baseUrl}/api/images?limit=${limit}&offset=${offset}`
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch images: ${res.statusText}`);
    }

    return res.json();
  }
}

export function createWebSocket(
  onMessage: (msg: WSMessage) => void,
  onError?: (err: Event) => void,
  onClose?: () => void
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws`);

  ws.onopen = () => {
    console.log("[WS] Connected to backend");
  };

  ws.onmessage = (event) => {
    try {
      const msg: WSMessage = JSON.parse(event.data);
      onMessage(msg);
    } catch {
      onMessage({ type: "log", data: event.data, timestamp: new Date().toISOString() });
    }
  };

  ws.onerror = (err) => {
    console.error("[WS] Error:", err);
    onError?.(err);
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected");
    onClose?.();
  };

  return ws;
}
