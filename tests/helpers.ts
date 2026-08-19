import { prisma } from "../src/prisma";
import { hashPassword, signToken } from "../src/services/auth.service";

export async function createTestUser(): Promise<string> {
  const user = await prisma.usuario.upsert({
    where: { email: "test@test.com" },
    update: {},
    create: { email: "test@test.com", password: await hashPassword("secreto") },
  });
  return signToken(user.id);
}

export async function seedPeriodo(mes = "Enero", anio = 2026) {
  return prisma.periodo.create({ data: { mes, anio } });
}