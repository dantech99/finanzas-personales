import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}