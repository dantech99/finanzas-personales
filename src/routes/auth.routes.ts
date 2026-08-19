import { Router } from "express";
import { AppError } from "../middleware/error";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { login } from "../services/auth.service";
import { prisma } from "../prisma";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: unknown;
      password?: unknown;
    };
    if (typeof email !== "string" || typeof password !== "string") {
      throw new AppError(400, "email y password son requeridos");
    }
    const result = await login(email.trim().toLowerCase(), password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.userId! },
      select: { id: true, email: true },
    });
    if (!user) throw new AppError(404, "Usuario no encontrado");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;