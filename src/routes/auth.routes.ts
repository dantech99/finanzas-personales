import { Router } from "express";
import { AppError } from "../middleware/error";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { login } from "../services/auth.service";
import { prisma } from "../prisma";

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Token JWT generado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       '400':
 *         description: email y password son requeridos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Obtener el usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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