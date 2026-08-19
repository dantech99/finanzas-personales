import { Router } from "express";
import { AppError } from "../middleware/error";
import { requireAuth } from "../middleware/auth";
import {
  createGasto,
  deleteGasto,
  listGastos,
  updateGasto,
} from "../services/gastos.service";
import {
  parseMesAnio,
  parseMonto,
  parseNota,
  parsePagado,
  parseRequeridoTexto,
} from "../validators";

const router = Router();

/**
 * @openapi
 * /periodos/{mes}/{anio}/gastos:
 *   get:
 *     summary: Listar gastos de un periodo
 *     tags: [Gastos]
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
 *       '200':
 *         description: Lista de gastos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Gasto'
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/periodos/:mes/:anio/gastos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await listGastos(mes, anio));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /periodos/{mes}/{anio}/gastos:
 *   post:
 *     summary: Crear un gasto en un periodo
 *     tags: [Gastos]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGastoRequest'
 *     responses:
 *       '201':
 *         description: Gasto creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gasto'
 *       '400':
 *         description: Datos inválidos o periodo inexistente
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
router.post("/periodos/:mes/:anio/gastos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    const concepto = parseRequeridoTexto(req.body.concepto, "Concepto");
    const valor = parseMonto(req.body.valor);
    const nota = parseNota(req.body.nota);
    const pagado = req.body.pagado === undefined ? false : parsePagado(req.body.pagado);
    let deudaId: number | null = null;
    if (req.body.deudaId !== undefined && req.body.deudaId !== null) {
      if (typeof req.body.deudaId !== "number" || !Number.isInteger(req.body.deudaId)) {
        throw new AppError(400, "deudaId inválido");
      }
      deudaId = req.body.deudaId;
    }
    const gasto = await createGasto(mes, anio, { concepto, valor, nota, pagado, deudaId });
    res.status(201).json(gasto);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /gastos/{id}:
 *   put:
 *     summary: Actualizar un gasto
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del gasto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGastoRequest'
 *     responses:
 *       '200':
 *         description: Gasto actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gasto'
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
 *         description: Gasto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/gastos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const concepto = parseRequeridoTexto(req.body.concepto, "Concepto");
    const valor = parseMonto(req.body.valor);
    const nota = parseNota(req.body.nota);
    const pagado = req.body.pagado === undefined ? false : parsePagado(req.body.pagado);
    let deudaId: number | null = null;
    if (req.body.deudaId !== undefined && req.body.deudaId !== null) {
      if (typeof req.body.deudaId !== "number" || !Number.isInteger(req.body.deudaId)) {
        throw new AppError(400, "deudaId inválido");
      }
      deudaId = req.body.deudaId;
    }
    const gasto = await updateGasto(id, { concepto, valor, nota, pagado, deudaId });
    res.json(gasto);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /gastos/{id}:
 *   delete:
 *     summary: Eliminar un gasto
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del gasto
 *     responses:
 *       '204':
 *         description: Gasto eliminado
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Gasto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/gastos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await deleteGasto(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;