import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("gastos", () => {
  it("lista gastos del periodo con nombre de deuda", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const deuda = await prisma.deuda.create({ data: { nombre: "TARJETA", montoTotal: 5000000 } });
    await prisma.gasto.create({
      data: { concepto: "CUOTA", valor: 300000, pagado: true, deudaId: deuda.id, periodoId: p.id },
    });
    const token = await authToken();
    const res = await request(app)
      .get("/periodos/Enero/2026/gastos")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ concepto: "CUOTA", valor: 300000, pagado: true, deudaNombre: "TARJETA" });
  });

  it("crea un gasto pagado en el periodo", async () => {
    await seedPeriodo("Enero", 2026);
    const token = await authToken();
    const res = await request(app)
      .post("/periodos/Enero/2026/gastos")
      .set("Authorization", `Bearer ${token}`)
      .send({ concepto: "ARRIENDO", valor: 800000, pagado: true });
    expect(res.status).toBe(201);
    expect(res.body.pagado).toBe(true);
  });

  it("actualiza pagado de un gasto", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const g = await prisma.gasto.create({ data: { concepto: "X", valor: 100, pagado: false, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .put(`/gastos/${g.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ concepto: "X", valor: 100, pagado: true });
    expect(res.status).toBe(200);
    expect(res.body.pagado).toBe(true);
  });

  it("elimina un gasto", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const g = await prisma.gasto.create({ data: { concepto: "X", valor: 100, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .delete(`/gastos/${g.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(await prisma.gasto.count()).toBe(0);
  });
});