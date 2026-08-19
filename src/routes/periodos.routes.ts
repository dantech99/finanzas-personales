import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createPeriodo,
  deletePeriodo,
  listPeriodos,
} from "../services/periodos.service";
import { parseMesAnio } from "../validators";

const router = Router();

/**
 * @openapi
 * /periodos:
 *   get:
 *     summary: Listar periodos con resumen calculado
 *     tags: [Periodos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de periodos con sus totales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PeriodoResumen'
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", requireAuth, async (_req, res, next) => {
  try {
    res.json(await listPeriodos());
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /periodos:
 *   post:
 *     summary: Crear un periodo
 *     tags: [Periodos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePeriodoRequest'
 *     responses:
 *       '201':
 *         description: Periodo creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Periodo'
 *       '400':
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '409':
 *         description: El periodo ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.body.mes, req.body.anio);
    const periodo = await createPeriodo(mes, anio);
    res.status(201).json(periodo);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /periodos/{mes}/{anio}:
 *   delete:
 *     summary: Eliminar un periodo y sus registros en cascada
 *     tags: [Periodos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mes
 *         required: true
 *         schema:
 *           type: string
 *         description: Mes del periodo (p. ej. "Enero")
 *       - in: path
 *         name: anio
 *         required: true
 *         schema:
 *           type: integer
 *         description: Año del periodo
 *     responses:
 *       '204':
 *         description: Periodo eliminado
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Periodo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:mes/:anio", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    await deletePeriodo(mes, anio);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;