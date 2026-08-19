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

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    res.json(await listDeudas());
  } catch (err) {
    next(err);
  }
});

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

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const nombre = parseRequeridoTexto(req.body.nombre, "Nombre");
    const montoTotal = parseMonto(req.body.montoTotal);
    const descripcion = parseNota(req.body.descripcion);
    res.json(await updateDeuda(id, nombre, montoTotal, descripcion));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteDeuda(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;