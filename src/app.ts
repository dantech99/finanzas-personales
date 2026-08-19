import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { errorHandler, notFound } from "./middleware/error";
import { swaggerSpec } from "./swagger";
import authRoutes from "./routes/auth.routes";
import deudasRoutes from "./routes/deudas.routes";
import gastosRoutes from "./routes/gastos.routes";
import ingresosRoutes from "./routes/ingresos.routes";
import periodosRoutes from "./routes/periodos.routes";
import resumenRoutes from "./routes/resumen.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/auth", authRoutes);
  app.use("/deudas", deudasRoutes);
  app.use("/", resumenRoutes);
  app.use("/", gastosRoutes);
  app.use("/", ingresosRoutes);
  app.use("/periodos", periodosRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}