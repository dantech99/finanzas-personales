import { AppError } from "./middleware/error";

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function parseMesAnio(
  mes: unknown,
  anio: unknown
): { mes: string; anio: number } {
  if (typeof mes !== "string" || !MESES.includes(mes)) {
    throw new AppError(400, "Mes inválido");
  }
  const a = typeof anio === "string" ? parseInt(anio, 10) : anio;
  if (typeof a !== "number" || !Number.isInteger(a) || a < 2000 || a > 2100) {
    throw new AppError(400, "Año inválido");
  }
  return { mes, anio: a };
}

export function parseMonto(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new AppError(400, "Valor inválido (entero no negativo)");
  }
  return v;
}

export function parseRequeridoTexto(v: unknown, campo: string): string {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new AppError(400, `${campo} requerido`);
  }
  return v.trim().toUpperCase();
}

export function parseNota(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw new AppError(400, "Nota inválida");
  return v.trim() === "" ? null : v.trim();
}

export function parsePagado(v: unknown): boolean {
  if (typeof v !== "boolean") throw new AppError(400, "pagado debe ser booleano");
  return v;
}