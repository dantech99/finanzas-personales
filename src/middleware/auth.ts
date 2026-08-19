import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error";
import { verifyToken } from "../services/auth.service";

export interface AuthRequest extends Request {
  userId?: number;
}

export function requireAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "Token requerido"));
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, "Token inválido o expirado"));
  }
}