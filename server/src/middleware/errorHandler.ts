import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error | undefined,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("[ERROR]", err?.message || "Unknown error");

  if (err instanceof Error) {
    return res.status(500).json({ error: err.message });
  }

  return res.status(500).json({ error: "Internal server error" });
}
