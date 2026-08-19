import Database from "better-sqlite3";

interface Row {
  id: number;
  nombre?: string;
  mes?: string;
  anio?: number;
  monto_total?: number;
  descripcion?: string | null;
  fuente?: string;
  valor?: number;
  concepto?: string;
  nota?: string | null;
  pagado?: number;
  deuda_id?: number | null;
}

export async function migrate(sqlitePath: string) {
  const { prisma } = await import("../src/prisma");
  const src = new Database(sqlitePath, { readonly: true });

  const existing = await prisma.periodo.count();
  if (existing > 0) {
    console.log(`BD destino ya tiene ${existing} periodos. Cancelando (idempotente).`);
    src.close();
    return;
  }

  const deudaMap = new Map<number, number>();
  for (const row of src.prepare("SELECT id, nombre, monto_total, descripcion FROM deudas").all() as Row[]) {
    const d = await prisma.deuda.create({
      data: {
        nombre: row.nombre!,
        montoTotal: row.monto_total!,
        descripcion: row.descripcion ? String(row.descripcion) : null,
      },
    });
    deudaMap.set(row.id, d.id);
  }

  const periodoMap = new Map<string, number>();
  for (const row of src.prepare("SELECT id, mes, anio FROM periodos").all() as Row[]) {
    const p = await prisma.periodo.create({ data: { mes: row.mes!, anio: row.anio! } });
    periodoMap.set(`${row.mes}|${row.anio}`, p.id);
  }

  for (const row of src.prepare("SELECT mes, anio, fuente, valor FROM ingresos").all() as Row[]) {
    await prisma.ingreso.create({
      data: {
        fuente: row.fuente!,
        valor: row.valor!,
        periodoId: periodoMap.get(`${row.mes}|${row.anio}`)!,
      },
    });
  }

  for (const row of src.prepare("SELECT mes, anio, concepto, valor, nota, pagado, deuda_id FROM gastos").all() as Row[]) {
    await prisma.gasto.create({
      data: {
        concepto: row.concepto!,
        valor: row.valor!,
        nota: row.nota ? String(row.nota) : null,
        pagado: row.pagado === 1,
        deudaId: row.deuda_id ? deudaMap.get(row.deuda_id) ?? null : null,
        periodoId: periodoMap.get(`${row.mes}|${row.anio}`)!,
      },
    });
  }

  src.close();
  console.log("Migración completada.");
}

async function main() {
  const sqlitePath = process.env.SQLITE_PATH ?? `${process.env.HOME}/finanzas_personales.db`;
  await migrate(sqlitePath);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}