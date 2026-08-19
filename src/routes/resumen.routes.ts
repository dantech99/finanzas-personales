import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getResumen } from "../services/resumen.service";
import { parseMesAnio } from "../validators";

const router = Router();

/**
 * @openapi
 * /periodos/{mes}/{anio}/resumen:
 *   get:
 *     summary: Obtener el resumen completo de un periodo
 *     tags: [Resumen]
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
 *         description: Resumen con totales, ingresos y gastos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resumen'
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
router.get("/periodos/:mes/:anio/resumen", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await getResumen(mes, anio));
  } catch (err) {
    next(err);
  }
});

export default router;