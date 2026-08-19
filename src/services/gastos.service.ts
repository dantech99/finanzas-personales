import { AppError } from "../middleware/error";
import { prisma } from "../prisma";
import { getPeriodoOrThrow } from "./periodos.service";

export interface GastoData {
  concepto: string;
  valor: number;
  nota?: string | null;
  pagado?: boolean;
  deudaId?: number | null;
}

export async function listGastos(mes: string, anio: number) {
  const periodo = await getPeriodoOrThrow(mes, anio);
  const gastos = await prisma.gasto.findMany({
    where: { periodoId: periodo.id },
    orderBy: { id: "asc" },
    include: { deuda: true },
  });
  return gastos.map((g) => ({
    id: g.id,
    concepto: g.concepto,
    valor: g.valor,
    nota: g.nota,
    pagado: g.pagado,
    deudaId: g.deudaId,
    deudaNombre: g.deuda?.nombre ?? null,
  }));
}

export async function createGasto(mes: string, anio: number, data: GastoData) {
  const periodo = await getPeriodoOrThrow(mes, anio);
  const gasto = await prisma.gasto.create({
    data: {
      concepto: data.concepto,
      valor: data.valor,
      nota: data.nota ?? null,
      pagado: data.pagado ?? false,
      deudaId: data.deudaId ?? null,
      periodoId: periodo.id,
    },
    include: { deuda: true },
  });
  return {
    id: gasto.id,
    concepto: gasto.concepto,
    valor: gasto.valor,
    nota: gasto.nota,
    pagado: gasto.pagado,
    deudaId: gasto.deudaId,
    deudaNombre: gasto.deuda?.nombre ?? null,
  };
}

export async function updateGasto(id: number, data: GastoData) {
  try {
    const gasto = await prisma.gasto.update({
      where: { id },
      data: {
        concepto: data.concepto,
        valor: data.valor,
        nota: data.nota ?? null,
        pagado: data.pagado ?? false,
        deudaId: data.deudaId ?? null,
      },
      include: { deuda: true },
    });
    return {
      id: gasto.id,
      concepto: gasto.concepto,
      valor: gasto.valor,
      nota: gasto.nota,
      pagado: gasto.pagado,
      deudaId: gasto.deudaId,
      deudaNombre: gasto.deuda?.nombre ?? null,
    };
  } catch {
    throw new AppError(404, "Gasto no encontrado");
  }
}

export async function deleteGasto(id: number) {
  try {
    await prisma.gasto.delete({ where: { id } });
  } catch {
    throw new AppError(404, "Gasto no encontrado");
  }
}