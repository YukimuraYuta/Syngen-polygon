import { useState, useCallback } from "react";
import type { UploadResponse } from "../types";
import { ApiClient } from "../api/client";

const SUPPORTED_EXTENSIONS = [".glb", ".gltf", ".obj", ".fbx", ".stl", ".ply"];

const api = new ApiClient();

export interface UploadSectionProps {
  onUploadComplete: (info: UploadResponse) => void;
}

export default function UploadSection({ onUploadComplete }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`);
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const response = await api.uploadFile(file);
        setUploadedFilename(response.filename);
        onUploadComplete(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleRemove = () => {
    setUploadedFilename(null);
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        3D Model
      </h2>

      {uploadedFilename ? (
        <div className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 19h14l-3-6h2l-5-7-5 7h2l-3 6z"
              />
            </svg>
            <span className="text-sm text-gray-200">{uploadedFilename}</span>
          </div>
          <button
            onClick={handleRemove}
            className="text-gray-500 hover:text-gray-300"
            title="Remove model"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              isDragging
                ? "border-blue-500 bg-gray-800/50"
                : "border-gray-700 hover:border-gray-600 bg-gray-800/30"
            } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              accept={SUPPORTED_EXTENSIONS.map((e) => e + ",*").join(",")}
              onChange={handleInputChange}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <svg
              className="w-10 h-10 mx-auto mb-3 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V8a4 4 0 018 0v8m-6 4h6a2 2 0 100-4H9a2 2 0 100 4z"
              />
            </svg>

            <p className="text-sm text-gray-400 mb-1">
              {isUploading
                ? "Uploading..."
                : "Drag & drop a 3D model, or click to browse"}
            </p>
            <p className="text-xs text-gray-600">
              GLB, GLTF, OBJ, FBX, STL, PLY
            </p>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
