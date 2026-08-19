import { AppError } from "../middleware/error";
import { prisma } from "../prisma";
import { getPeriodoOrThrow } from "./periodos.service";

export async function listIngresos(mes: string, anio: number) {
  const periodo = await getPeriodoOrThrow(mes, anio);
  return prisma.ingreso.findMany({
    where: { periodoId: periodo.id },
    orderBy: { id: "asc" },
    select: { id: true, fuente: true, valor: true },
  });
}

export async function createIngreso(
  mes: string,
  anio: number,
  fuente: string,
  valor: number
) {
  const periodo = await getPeriodoOrThrow(mes, anio);
  return prisma.ingreso.create({
    data: { fuente, valor, periodoId: periodo.id },
    select: { id: true, fuente: true, valor: true },
  });
}

export async function updateIngreso(
  id: number,
  fuente: string,
  valor: number
) {
  try {
    return await prisma.ingreso.update({
      where: { id },
      data: { fuente, valor },
      select: { id: true, fuente: true, valor: true },
    });
  } catch {
    throw new AppError(404, "Ingreso no encontrado");
  }
}

export async function deleteIngreso(id: number) {
  try {
    await prisma.ingreso.delete({ where: { id } });
  } catch {
    throw new AppError(404, "Ingreso no encontrado");
  }
}