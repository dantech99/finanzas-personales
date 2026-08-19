import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("deudas", () => {
  it("lista deudas con abonado, pendiente y pct", async () => {
    const deuda = await prisma.deuda.create({ data: { nombre: "TARJETA", montoTotal: 1000000 } });
    const p = await seedPeriodo("Enero", 2026);
    await prisma.gasto.create({ data: { concepto: "CUOTA 1", valor: 300000, pagado: true, deudaId: deuda.id, periodoId: p.id } });
    await prisma.gasto.create({ data: { concepto: "CUOTA 2", valor: 200000, pagado: true, deudaId: deuda.id, periodoId: p.id } });
    await prisma.gasto.create({ data: { concepto: "CUOTA 3", valor: 100000, pagado: false, deudaId: deuda.id, periodoId: p.id } });

    const token = await authToken();
    const res = await request(app)
      .get("/deudas")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual({
      id: deuda.id,
      nombre: "TARJETA",
      montoTotal: 1000000,
      descripcion: null,
      abonado: 500000,
      pendiente: 500000,
      pct: 50,
    });
  });

  it("no deja que pct supere 100", async () => {
    const deuda = await prisma.deuda.create({ data: { nombre: "X", montoTotal: 100 } });
    const p = await seedPeriodo("Enero", 2026);
    await prisma.gasto.create({ data: { concepto: "Y", valor: 300, pagado: true, deudaId: deuda.id, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .get("/deudas")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body[0].pct).toBe(100);
    expect(res.body[0].pendiente).toBe(0);
  });

  it("crea y actualiza una deuda", async () => {
    const token = await authToken();
    const created = await request(app)
      .post("/deudas")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "PRESTAMO", montoTotal: 5000000 });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .put(`/deudas/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "PRESTAMO PAPI", montoTotal: 4500000, descripcion: "En dólares" });
    expect(updated.status).toBe(200);
    expect(updated.body.nombre).toBe("PRESTAMO PAPI");
  });

  it("borrar una deuda deja sus gastos sin deuda", async () => {
    const deuda = await prisma.deuda.create({ data: { nombre: "X", montoTotal: 100 } });
    const p = await seedPeriodo("Enero", 2026);
    const g = await prisma.gasto.create({ data: { concepto: "Y", valor: 50, pagado: true, deudaId: deuda.id, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .delete(`/deudas/${deuda.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    const gasto = await prisma.gasto.findUnique({ where: { id: g.id } });
    expect(gasto!.deudaId).toBeNull();
  });
});