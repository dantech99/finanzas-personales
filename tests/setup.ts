import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/prisma";

beforeEach(async () => {
  await prisma.$transaction([
    prisma.gasto.deleteMany(),
    prisma.ingreso.deleteMany(),
    prisma.deuda.deleteMany(),
    prisma.periodo.deleteMany(),
    prisma.usuario.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});