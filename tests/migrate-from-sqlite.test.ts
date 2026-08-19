import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/prisma";
import { migrate } from "../scripts/migrate-from-sqlite";

function buildFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "finanzas-migrate-"));
  const file = join(dir, "fixture.db");
  const db = new Database(file);
  db.exec(`
    CREATE TABLE deudas (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, monto_total INTEGER NOT NULL, descripcion TEXT DEFAULT '');
    CREATE TABLE periodos (id INTEGER PRIMARY KEY AUTOINCREMENT, mes TEXT NOT NULL, anio INTEGER NOT NULL, UNIQUE(mes, anio));
    CREATE TABLE ingresos (id INTEGER PRIMARY KEY AUTOINCREMENT, mes TEXT NOT NULL, anio INTEGER NOT NULL, fuente TEXT NOT NULL, valor INTEGER NOT NULL);
    CREATE TABLE gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, mes TEXT NOT NULL, anio INTEGER NOT NULL, concepto TEXT NOT NULL, valor INTEGER NOT NULL, nota TEXT DEFAULT '', pagado INTEGER NOT NULL DEFAULT 0, deuda_id INTEGER);
  `);
  db.prepare("INSERT INTO deudas (id, nombre, monto_total, descripcion) VALUES (1, 'TARJETA', 1000000, '')").run();
  db.prepare("INSERT INTO periodos (id, mes, anio) VALUES (1, 'Enero', 2026)").run();
  db.prepare("INSERT INTO ingresos (mes, anio, fuente, valor) VALUES ('Enero', 2026, 'SALARIO', 2000000)").run();
  db.prepare("INSERT INTO gastos (mes, anio, concepto, valor, nota, pagado, deuda_id) VALUES ('Enero', 2026, 'CUOTA', 300000, 'primera', 1, 1)").run();
  db.close();
  return file;
}

beforeEach(async () => {
  await prisma.$transaction([
    prisma.gasto.deleteMany(),
    prisma.ingreso.deleteMany(),
    prisma.deuda.deleteMany(),
    prisma.periodo.deleteMany(),
  ]);
});

describe("migrate-from-sqlite", () => {
  it("migra deudas, periodos, ingresos y gastos", async () => {
    const file = buildFixture();
    await migrate(file);
    rmSync(file, { recursive: true });

    const deuda = await prisma.deuda.findFirst();
    expect(deuda!.nombre).toBe("TARJETA");
    expect(deuda!.montoTotal).toBe(1000000);

    const periodo = await prisma.periodo.findFirst();
    expect(periodo!.mes).toBe("Enero");

    const ingreso = await prisma.ingreso.findFirst();
    expect(ingreso!.fuente).toBe("SALARIO");
    expect(ingreso!.valor).toBe(2000000);

    const gasto = await prisma.gasto.findFirst();
    expect(gasto!.concepto).toBe("CUOTA");
    expect(gasto!.valor).toBe(300000);
    expect(gasto!.pagado).toBe(true);
    expect(gasto!.deudaId).toBe(deuda!.id);
  });

  it("es idempotente: no migra dos veces", async () => {
    const file = buildFixture();
    await migrate(file);
    await migrate(file);
    rmSync(file, { recursive: true });
    expect(await prisma.periodo.count()).toBe(1);
    expect(await prisma.ingreso.count()).toBe(1);
  });
});