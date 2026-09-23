import { useState } from "react";

export interface WorkflowControlsProps {
  modelUploaded: boolean;
  isRunning: boolean;
  imageCount: number;
  onStart: () => void;
  onStop: () => void;
}

export default function WorkflowControls({
  modelUploaded,
  isRunning,
  imageCount,
  onStart,
  onStop,
}: WorkflowControlsProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const handleStart = async () => {
    if (isRunning) return;
    setIsStarting(true);
    try {
      await onStart();
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!isRunning) return;
    setIsStopping(true);
    try {
      await onStop();
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Workflow
      </h2>

      <div className="flex gap-3 mb-4">
        <button
          onClick={handleStart}
          disabled={!modelUploaded || isRunning}
          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            modelUploaded && !isRunning
              ? "bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isStarting ? (
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 7l9 9 9-9"
              />
            </svg>
          )}
          Start Workflow
        </button>

        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            isRunning
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isStopping ? (
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12H9m0 0l5-5m-5 5l5 5"
              />
            </svg>
          )}
          Stop
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16s8 4 16 0M4 16v-4a4 4 0 014-4h8a4 4 0 014 4v4"
          />
        </svg>
        <span className="text-2xl font-bold text-white">{imageCount}</span>
        <span className="text-sm text-gray-400">images generated</span>
      </div>

      {isRunning && (
        <div className="flex items-center gap-2 text-sm text-blue-400">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span>Workflow in progress</span>
        </div>
      )}

      {!modelUploaded && (
        <p className="text-xs text-gray-500 mt-2">
          Upload a 3D model to enable workflow
        </p>
      )}
    </div>
  );
}
