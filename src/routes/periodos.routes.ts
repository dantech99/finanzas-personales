import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createPeriodo,
  deletePeriodo,
  listPeriodos,
} from "../services/periodos.service";
import { parseMesAnio } from "../validators";

const router = Router();

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    res.json(await listPeriodos());
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.body.mes, req.body.anio);
    const periodo = await createPeriodo(mes, anio);
    res.status(201).json(periodo);
  } catch (err) {
    next(err);
  }
});

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