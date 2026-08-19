import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";
import gastosRoutes from "./routes/gastos.routes";
import ingresosRoutes from "./routes/ingresos.routes";
import periodosRoutes from "./routes/periodos.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use("/", gastosRoutes);
  app.use("/", ingresosRoutes);
  app.use("/periodos", periodosRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}