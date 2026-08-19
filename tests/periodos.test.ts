import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("periodos", () => {
  it("lista periodos con resumen calculado", async () => {
    await seedPeriodo("Enero", 2026);
    const p = await prisma.periodo.findUnique({
      where: { mes_anio: { mes: "Enero", anio: 2026 } },
    });
    await prisma.ingreso.create({ data: { fuente: "SALARIO", valor: 2000000, periodoId: p!.id } });
    await prisma.gasto.create({ data: { concepto: "ARRIENDO", valor: 800000, pagado: true, periodoId: p!.id } });
    await prisma.gasto.create({ data: { concepto: "SERVICIOS", valor: 200000, pagado: false, periodoId: p!.id } });

    const token = await authToken();
    const res = await request(app)
      .get("/periodos")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual({
      mes: "Enero",
      anio: 2026,
      totalIngresos: 2000000,
      totalGastos: 800000,
      totalPendiente: 200000,
      restante: 1200000,
    });
  });

  it("crea un periodo", async () => {
    const token = await authToken();
    const res = await request(app)
      .post("/periodos")
      .set("Authorization", `Bearer ${token}`)
      .send({ mes: "Febrero", anio: 2026 });
    expect(res.status).toBe(201);
  });

  it("rechaza periodo duplicado con 409", async () => {
    await seedPeriodo("Enero", 2026);
    const token = await authToken();
    const res = await request(app)
      .post("/periodos")
      .set("Authorization", `Bearer ${token}`)
      .send({ mes: "Enero", anio: 2026 });
    expect(res.status).toBe(409);
  });

  it("borra un periodo y sus registros en cascada", async () => {
    const p = await seedPeriodo("Enero", 2026);
    await prisma.ingreso.create({ data: { fuente: "SALARIO", valor: 1000000, periodoId: p.id } });

    const token = await authToken();
    const res = await request(app)
      .delete("/periodos/Enero/2026")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    const count = await prisma.periodo.count();
    expect(count).toBe(0);
    const ing = await prisma.ingreso.count();
    expect(ing).toBe(0);
  });

  it("devuelve 404 al borrar periodo inexistente", async () => {
    const token = await authToken();
    const res = await request(app)
      .delete("/periodos/Enero/2020")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});