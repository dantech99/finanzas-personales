import { prisma } from "../prisma";
import { getPeriodoOrThrow } from "./periodos.service";

export async function getResumen(mes: string, anio: number) {
  const periodo = await getPeriodoOrThrow(mes, anio);
  const data = await prisma.periodo.findUnique({
    where: { id: periodo.id },
    include: {
      ingresos: { orderBy: { id: "asc" } },
      gastos: { orderBy: { id: "asc" }, include: { deuda: true } },
    },
  });
  const totalIngresos = data!.ingresos.reduce((s, i) => s + i.valor, 0);
  const totalGastos = data!.gastos
    .filter((g) => g.pagado)
    .reduce((s, g) => s + g.valor, 0);
  const totalPendiente = data!.gastos
    .filter((g) => !g.pagado)
    .reduce((s, g) => s + g.valor, 0);
  return {
    totalIngresos,
    totalGastos,
    totalPendiente,
    restante: totalIngresos - totalGastos,
    ingresos: data!.ingresos.map((i) => ({
      id: i.id,
      fuente: i.fuente,
      valor: i.valor,
    })),
    gastos: data!.gastos.map((g) => ({
      id: g.id,
      concepto: g.concepto,
      valor: g.valor,
      nota: g.nota,
      pagado: g.pagado,
      deudaId: g.deudaId,
      deudaNombre: g.deuda?.nombre ?? null,
    })),
  };
}