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

router.get("/periodos/:mes/:anio/ingresos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await listIngresos(mes, anio));
  } catch (err) {
    next(err);
  }
});

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