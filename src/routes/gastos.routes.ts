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

router.get("/periodos/:mes/:anio/gastos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await listGastos(mes, anio));
  } catch (err) {
    next(err);
  }
});

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

router.put("/gastos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
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

router.delete("/gastos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteGasto(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;