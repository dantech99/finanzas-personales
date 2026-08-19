import { Prisma } from "@prisma/client";
import { AppError } from "../middleware/error";
import { prisma } from "../prisma";

export async function listPeriodos() {
  const periodos = await prisma.periodo.findMany({
    orderBy: [{ anio: "desc" }, { id: "desc" }],
    include: { ingresos: true, gastos: true },
  });
  return periodos.map((p) => {
    const totalIngresos = p.ingresos.reduce((s, i) => s + i.valor, 0);
    const totalGastos = p.gastos
      .filter((g) => g.pagado)
      .reduce((s, g) => s + g.valor, 0);
    const totalPendiente = p.gastos
      .filter((g) => !g.pagado)
      .reduce((s, g) => s + g.valor, 0);
    return {
      mes: p.mes,
      anio: p.anio,
      totalIngresos,
      totalGastos,
      totalPendiente,
      restante: totalIngresos - totalGastos,
    };
  });
}

export async function createPeriodo(mes: string, anio: number) {
  try {
    return await prisma.periodo.create({ data: { mes, anio } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new AppError(409, "El periodo ya existe");
    }
    throw err;
  }
}

export async function deletePeriodo(mes: string, anio: number) {
  const result = await prisma.periodo.deleteMany({ where: { mes, anio } });
  if (result.count === 0) {
    throw new AppError(404, "Periodo no encontrado");
  }
}

export async function getPeriodoOrThrow(mes: string, anio: number) {
  const periodo = await prisma.periodo.findUnique({
    where: { mes_anio: { mes, anio } },
  });
  if (!periodo) throw new AppError(404, "Periodo no encontrado");
  return periodo;
}