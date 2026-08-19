import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createDeuda,
  deleteDeuda,
  listDeudas,
  updateDeuda,
} from "../services/deudas.service";
import { parseMonto, parseRequeridoTexto } from "../validators";
import { parseNota } from "../validators";

const router = Router();

/**
 * @openapi
 * /deudas:
 *   get:
 *     summary: Listar deudas con saldo abonado y pendiente
 *     tags: [Deudas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de deudas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeudaConSaldo'
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", requireAuth, async (_req, res, next) => {
  try {
    res.json(await listDeudas());
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /deudas:
 *   post:
 *     summary: Crear una deuda
 *     tags: [Deudas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeudaRequest'
 *     responses:
 *       '201':
 *         description: Deuda creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Deuda'
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
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const nombre = parseRequeridoTexto(req.body.nombre, "Nombre");
    const montoTotal = parseMonto(req.body.montoTotal);
    const descripcion = parseNota(req.body.descripcion);
    const deuda = await createDeuda(nombre, montoTotal, descripcion);
    res.status(201).json(deuda);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /deudas/{id}:
 *   put:
 *     summary: Actualizar una deuda
 *     tags: [Deudas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la deuda
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeudaRequest'
 *     responses:
 *       '200':
 *         description: Deuda actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Deuda'
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
 *       '404':
 *         description: Deuda no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const nombre = parseRequeridoTexto(req.body.nombre, "Nombre");
    const montoTotal = parseMonto(req.body.montoTotal);
    const descripcion = parseNota(req.body.descripcion);
    res.json(await updateDeuda(id, nombre, montoTotal, descripcion));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /deudas/{id}:
 *   delete:
 *     summary: Eliminar una deuda
 *     tags: [Deudas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la deuda
 *     responses:
 *       '204':
 *         description: Deuda eliminada
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Deuda no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await deleteDeuda(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;