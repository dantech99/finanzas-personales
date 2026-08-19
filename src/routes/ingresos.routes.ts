import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createIngreso,
  deleteIngreso,
  listIngresos,
  updateIngreso,
} from "../services/ingresos.service";
import {
  parseMesAnio,
  parseMonto,
  parseRequeridoTexto,
} from "../validators";

const router = Router();

/**
 * @openapi
 * /periodos/{mes}/{anio}/ingresos:
 *   get:
 *     summary: Listar ingresos de un periodo
 *     tags: [Ingresos]
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
 *         description: Lista de ingresos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ingreso'
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/periodos/:mes/:anio/ingresos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await listIngresos(mes, anio));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /periodos/{mes}/{anio}/ingresos:
 *   post:
 *     summary: Crear un ingreso en un periodo
 *     tags: [Ingresos]
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
 *             $ref: '#/components/schemas/CreateIngresoRequest'
 *     responses:
 *       '201':
 *         description: Ingreso creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingreso'
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
router.post("/periodos/:mes/:anio/ingresos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    const fuente = parseRequeridoTexto(req.body.fuente, "Fuente");
    const valor = parseMonto(req.body.valor);
    const ingreso = await createIngreso(mes, anio, fuente, valor);
    res.status(201).json(ingreso);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /ingresos/{id}:
 *   put:
 *     summary: Actualizar un ingreso
 *     tags: [Ingresos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del ingreso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateIngresoRequest'
 *     responses:
 *       '200':
 *         description: Ingreso actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingreso'
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
 *         description: Ingreso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/ingresos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const fuente = parseRequeridoTexto(req.body.fuente, "Fuente");
    const valor = parseMonto(req.body.valor);
    res.json(await updateIngreso(id, fuente, valor));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /ingresos/{id}:
 *   delete:
 *     summary: Eliminar un ingreso
 *     tags: [Ingresos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del ingreso
 *     responses:
 *       '204':
 *         description: Ingreso eliminado
 *       '401':
 *         description: Token ausente o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Ingreso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/ingresos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await deleteIngreso(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;