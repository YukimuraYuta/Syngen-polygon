import { useState, useEffect, useCallback } from "react";
import type { ImageInfo, ImagesResponse } from "../types";
import { ApiClient } from "../api/client";

const api = new ApiClient();

const LIMIT = 10;

export default function ImageGallery() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async (currentOffset: number) => {
    setError(null);
    try {
      const data: ImagesResponse = await api.getImages(LIMIT, currentOffset);
      setImages(data.images);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void loadImages(0);
  }, [loadImages]);

  const handlePrev = () => {
    const newOffset = Math.max(0, offset - LIMIT);
    setOffset(newOffset);
    setIsLoading(true);
    void loadImages(newOffset);
  };

  const handleNext = () => {
    const newOffset = offset + LIMIT;
    if (newOffset >= total) return;
    setOffset(newOffset);
    setIsLoading(true);
    void loadImages(newOffset);
  };

  const hasPrev = offset > 0;
  const hasNext = offset + LIMIT < total;
  const startIdx = total > 0 ? total - offset : 0;
  const endIdx = Math.max(0, startIdx - images.length + 1);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Latest Images
        </h2>
        <span className="text-xs text-gray-500">
          {total} total
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12 text-gray-600 border border-gray-700 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l16-16m0 0l-4 4m4-4v4h-4"
            />
          </svg>
          <p>No images generated yet</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2">
            {images.map((img) => (
              <div
                key={img.id}
                className="aspect-square rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors bg-gray-800"
              >
                <img
                  src={api.resolveImageUrl(img.url)}
                  alt={img.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">
              {total > 0
                ? `${endIdx}–${startIdx} of ${total}`
                : ""}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className={`p-1 rounded text-xs transition-colors ${
                  hasPrev
                    ? "text-gray-300 hover:bg-gray-800"
                    : "text-gray-600 cursor-not-allowed"
                }`}
              >
                Prev
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className={`p-1 rounded text-xs transition-colors ${
                  hasNext
                    ? "text-gray-300 hover:bg-gray-800"
                    : "text-gray-600 cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
