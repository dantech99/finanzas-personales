import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("ingresos", () => {
  it("lista los ingresos del periodo", async () => {
    const p = await seedPeriodo("Enero", 2026);
    await prisma.ingreso.create({ data: { fuente: "SALARIO", valor: 2000000, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .get("/periodos/Enero/2026/ingresos")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ fuente: "SALARIO", valor: 2000000 });
  });

  it("crea un ingreso en el periodo", async () => {
    await seedPeriodo("Enero", 2026);
    const token = await authToken();
    const res = await request(app)
      .post("/periodos/Enero/2026/ingresos")
      .set("Authorization", `Bearer ${token}`)
      .send({ fuente: "BONO", valor: 500000 });
    expect(res.status).toBe(201);
  });

  it("rechaza crear ingreso en periodo inexistente con 404", async () => {
    const token = await authToken();
    const res = await request(app)
      .post("/periodos/Enero/2020/ingresos")
      .set("Authorization", `Bearer ${token}`)
      .send({ fuente: "X", valor: 1000 });
    expect(res.status).toBe(404);
  });

  it("actualiza un ingreso", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const ing = await prisma.ingreso.create({ data: { fuente: "A", valor: 100, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .put(`/ingresos/${ing.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fuente: "B", valor: 200 });
    expect(res.status).toBe(200);
    const updated = await prisma.ingreso.findUnique({ where: { id: ing.id } });
    expect(updated!.valor).toBe(200);
  });

  it("elimina un ingreso", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const ing = await prisma.ingreso.create({ data: { fuente: "A", valor: 100, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .delete(`/ingresos/${ing.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(await prisma.ingreso.count()).toBe(0);
  });
});