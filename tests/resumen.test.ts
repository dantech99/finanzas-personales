import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("resumen", () => {
  it("devuelve totales y detalle del mes", async () => {
    const p = await seedPeriodo("Enero", 2026);
    await prisma.ingreso.create({ data: { fuente: "SALARIO", valor: 2000000, periodoId: p.id } });
    await prisma.gasto.create({ data: { concepto: "ARRIENDO", valor: 800000, pagado: true, periodoId: p.id } });
    await prisma.gasto.create({ data: { concepto: "SERVICIOS", valor: 200000, pagado: false, periodoId: p.id } });

    const token = await authToken();
    const res = await request(app)
      .get("/periodos/Enero/2026/resumen")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalIngresos: 2000000,
      totalGastos: 800000,
      totalPendiente: 200000,
      restante: 1200000,
    });
    expect(res.body.ingresos).toHaveLength(1);
    expect(res.body.gastos).toHaveLength(2);
  });

  it("devuelve 404 para un periodo inexistente", async () => {
    const token = await authToken();
    const res = await request(app)
      .get("/periodos/Enero/2020/resumen")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});