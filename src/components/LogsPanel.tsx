import { useState, useRef, useEffect } from "react";
import type { WSMessage } from "../types";

export interface LogsPanelProps {
  messages: WSMessage[];
  isConnected: boolean;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

function getLevel(msg: WSMessage): "info" | "error" | "success" {
  const data = msg.type === "log" ? msg.data : "";
  if (msg.type === "status" && !msg.running) return "info";
  if (data.toLowerCase().includes("error") || data.toLowerCase().includes("fail")) {
    return "error";
  }
  if (data.toLowerCase().includes("success") || data.toLowerCase().includes("complete")) {
    return "success";
  }
  return "info";
}

export default function LogsPanel({ messages, isConnected }: LogsPanelProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Logs
        </h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-400" : "bg-red-400"
            }`}
          />
          <span className="text-xs text-gray-500">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="bg-gray-900 border border-gray-700 rounded-lg h-48 overflow-y-auto font-mono text-xs"
      >
        <div className="p-3">
          {messages.length === 0 ? (
            <p className="text-gray-600 italic">
              No logs yet. Start a workflow to see output.
            </p>
          ) : (
            messages.map((msg, i) => {
              const level = getLevel(msg);
              const colorClass =
                level === "error"
                  ? "text-red-400"
                  : level === "success"
                  ? "text-green-400"
                  : "text-gray-300";

              if (msg.type === "status") {
                return (
                  <div key={i} className="mb-1">
                    <span className="text-gray-500">[{formatTimestamp(
                      new Date().toISOString()
                    )}]</span>{" "}
                    <span className={colorClass}>
                      Workflow {msg.running ? "started" : "stopped"}
                      {msg.jobId && ` (job: ${msg.jobId})`}
                    </span>
                  </div>
                );
              }

              if (msg.type === "image_generated") {
                return (
                  <div key={i} className="mb-1">
                    <span className="text-gray-500">[{formatTimestamp(
                      msg.timestamp || new Date().toISOString()
                    )}]</span>{" "}
                    <span className="text-blue-400">
                      Image generated (total: {msg.count})
                    </span>
                  </div>
                );
              }

              return (
                <div key={i} className="mb-1">
                  <span className="text-gray-500">[{formatTimestamp(
                    msg.timestamp
                  )}]</span>{" "}
                  <span className={colorClass}>{msg.data}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="h-3 w-3 rounded"
          />
          Auto-scroll
        </label>
        <button
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop =
                containerRef.current.scrollHeight;
            }
          }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Scroll to bottom
        </button>
      </div>
    </div>
  );
}
