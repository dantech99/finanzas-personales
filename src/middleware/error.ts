import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}