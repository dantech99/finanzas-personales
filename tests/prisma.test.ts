import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/prisma";

beforeEach(async () => {
  await prisma.ingreso.deleteMany();
  await prisma.gasto.deleteMany();
  await prisma.deuda.deleteMany();
  await prisma.periodo.deleteMany();
  await prisma.usuario.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("prisma", () => {
  it("crea y lee un periodo", async () => {
    await prisma.periodo.create({ data: { mes: "Enero", anio: 2026 } });
    const p = await prisma.periodo.findUnique({
      where: { mes_anio: { mes: "Enero", anio: 2026 } },
    });
    expect(p).not.toBeNull();
    expect(p!.anio).toBe(2026);
  });
});