import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getResumen } from "../services/resumen.service";
import { parseMesAnio } from "../validators";

const router = Router();

router.get("/periodos/:mes/:anio/resumen", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await getResumen(mes, anio));
  } catch (err) {
    next(err);
  }
});

export default router;