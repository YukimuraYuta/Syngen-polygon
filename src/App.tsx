import { useState, useEffect, useCallback, useRef } from "react";
import UploadSection from "./components/UploadSection";
import WorkflowControls from "./components/WorkflowControls";
import LogsPanel from "./components/LogsPanel";
import ImageGallery from "./components/ImageGallery";
import { ApiClient, createWebSocket } from "./api/client";
import type { WSMessage, UploadResponse } from "./types";

export default function App() {
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const [logs, setLogs] = useState<WSMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [galleryRefresh, setGalleryRefresh] = useState(0);

  const apiRef = useRef(new ApiClient());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const addLog = useCallback((msg: WSMessage) => {
    setLogs((prev) => {
      const updated = [...prev, msg];
      if (updated.length > 500) {
        updated.shift();
      }
      return updated;
    });

    if (msg.type === "status") {
      setIsRunning(msg.running);
    }
    if (msg.type === "image_generated") {
      setImageCount(msg.count);
      setGalleryRefresh((prev) => prev + 1);
    }
  }, []);

  useEffect(() => {
    const connect = () => {
      const ws = createWebSocket(
        addLog,
        () => setWsConnected(false),
        () => {
          setWsConnected(false);
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
          }
        }
      );

      ws.onopen = () => {
        setWsConnected(true);
        reconnectTimeoutRef.current = null;
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [addLog]);

  const fetchInitialCount = useCallback(async () => {
    try {
      const count = await apiRef.current.getImageCount();
      setImageCount(count);
    } catch {
      // Backend not running yet - count stays 0
    }
  }, []);

  const fetchWorkflowStatus = useCallback(async () => {
    try {
      const status = await apiRef.current.getWorkflowStatus();
      setIsRunning(status.running);
    } catch {
      // Backend not running yet - leave state as-is
    }
  }, []);

  useEffect(() => {
    fetchInitialCount();
    fetchWorkflowStatus();
  }, [fetchInitialCount, fetchWorkflowStatus]);

  const handleUploadComplete = (info: UploadResponse) => {
    setUploadedFile(info);
  };

  const handleStart = async () => {
    const response = await apiRef.current.startWorkflow();
    console.log("Workflow started:", response.jobId);
  };

  const handleStop = async () => {
    await apiRef.current.stopWorkflow();
    console.log("Workflow stop requested");
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <div className="flex flex-col w-80 border-r border-gray-800 p-6 overflow-y-auto">
        <h1 className="text-xl font-bold mb-6">SynGen Polygon</h1>

        <UploadSection onUploadComplete={handleUploadComplete} />

        <WorkflowControls
          modelUploaded={uploadedFile !== null}
          isRunning={isRunning}
          imageCount={imageCount}
          onStart={handleStart}
          onStop={handleStop}
        />

        <LogsPanel messages={logs} isConnected={wsConnected} />
      </div>

      <div className="flex-1 p-6 overflow-auto bg-gray-950">
        <ImageGallery key={galleryRefresh} />
      </div>
    </div>
  );
}
