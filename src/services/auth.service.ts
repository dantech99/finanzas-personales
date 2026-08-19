import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "../middleware/error";
import { prisma } from "../prisma";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyToken(token: string): { sub: number } {
  return jwt.verify(token, config.jwtSecret) as { sub: number };
}

export async function login(email: string, password: string) {
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) throw new AppError(401, "Credenciales inválidas");
  const ok = await verifyPassword(password, user.password);
  if (!ok) throw new AppError(401, "Credenciales inválidas");
  return {
    token: signToken(user.id),
    user: { id: user.id, email: user.email },
  };
}