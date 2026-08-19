import { AppError } from "../middleware/error";
import { prisma } from "../prisma";

export async function listDeudas() {
  const deudas = await prisma.deuda.findMany({
    orderBy: { id: "asc" },
    include: { gastos: true },
  });
  return deudas.map((d) => {
    const abonado = d.gastos
      .filter((g) => g.pagado)
      .reduce((s, g) => s + g.valor, 0);
    const pendiente = Math.max(d.montoTotal - abonado, 0);
    const pct =
      d.montoTotal > 0
        ? Math.min(Math.round((abonado / d.montoTotal) * 100), 100)
        : 0;
    return {
      id: d.id,
      nombre: d.nombre,
      montoTotal: d.montoTotal,
      descripcion: d.descripcion,
      abonado,
      pendiente,
      pct,
    };
  });
}

export async function createDeuda(
  nombre: string,
  montoTotal: number,
  descripcion: string | null
) {
  return prisma.deuda.create({
    data: { nombre, montoTotal, descripcion },
    select: {
      id: true,
      nombre: true,
      montoTotal: true,
      descripcion: true,
    },
  });
}

export async function updateDeuda(
  id: number,
  nombre: string,
  montoTotal: number,
  descripcion: string | null
) {
  try {
    return await prisma.deuda.update({
      where: { id },
      data: { nombre, montoTotal, descripcion },
      select: { id: true, nombre: true, montoTotal: true, descripcion: true },
    });
  } catch {
    throw new AppError(404, "Deuda no encontrada");
  }
}

export async function deleteDeuda(id: number) {
  try {
    await prisma.deuda.delete({ where: { id } });
  } catch {
    throw new AppError(404, "Deuda no encontrada");
  }
}