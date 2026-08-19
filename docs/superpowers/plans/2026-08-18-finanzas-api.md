# Finanzas Personales API — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y desplegar una API REST en Node.js + TypeScript + Express + Prisma + PostgreSQL para manejar finanzas personales, replicando la lógica de la app de escritorio Python original y migrando sus datos.

**Architecture:** Monolito Express modular con capas separadas (routes → services → Prisma). Autenticación JWT de un solo usuario. Migración de datos desde el SQLite original (`~/finanzas_personales.db`). Despliegue en VPS vía Dokploy con Docker.

**Tech Stack:** Node.js 20, TypeScript, Express 4, Prisma ORM, PostgreSQL 16, jsonwebtoken, bcrypt, vitest, supertest, better-sqlite3 (solo migración), Docker.

**Spec:** `docs/superpowers/specs/2026-08-18-finanzas-api-design.md`

## Global Constraints

- Valores monetarios: **enteros COP**, nunca flotantes ni decimales.
- `mes` se guarda como texto en español: `"Enero"`, `"Febrero"`, …, `"Diciembre"`.
- Respuestas JSON en camelCase; errores `{error: string}` con códigos HTTP correctos (400 validación, 401 auth, 404 no existe, 409 periodo duplicado).
- Todas las rutas excepto `/auth/login` requieren `Authorization: Bearer <token>`.
- `Periodo` es fuente de verdad de meses; borrarlo elimina en cascada sus ingresos/gastos.
- Borrar una deuda deja sus gastos con `deudaId = null` (SET NULL).
- Restante mensual = `Σ ingresos − Σ gastos pagados`.
- Progreso de deuda: `abonado = Σ valor de gastos con deudaId=X y pagado=true`; `pendiente = max(montoTotal − abonado, 0)`; `pct = min(round(abonado/montoTotal×100), 100)`.
- Nombres de archivo, endpoints y convenciones según el spec (no renombrar).
- Todo el código sin comentarios salvo donde se indique explícitamente.

## BD de desarrollo

Tareas 2 en adelante asumen un Postgres local vía Docker:

```bash
docker run --name finanzas-pg-dev -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=finanzas -p 5432:5432 -d postgres:16-alpine
```

`DATABASE_URL` de desarrollo: `postgresql://postgres:postgres@localhost:5432/finanzas`

---

### Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.env` (local, no se commitea)

**Interfaces:**
- Produces: `package.json` con scripts (`dev`, `build`, `start`, `typecheck`, `test`, `prisma:*`, `create-user`, `migrate:sqlite`), lockfile via `npm install`.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "finanzas-api",
  "version": "0.1.0",
  "private": true,
  "description": "API REST de finanzas personales",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:migrate:dev": "prisma migrate dev",
    "create-user": "tsx scripts/create-user.ts",
    "migrate:sqlite": "tsx scripts/migrate-from-sqlite.ts"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Crear `.gitignore`**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 3b: Crear `src/index.ts` placeholder (para que `tsc` tenga input; se reemplaza en la Task 3)**

```ts
console.log("finanzas-api");
```

- [ ] **Step 4: Crear `.env.example`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finanzas
JWT_SECRET=cambiar-por-un-secreto-largo
PORT=3000
JWT_EXPIRES_IN=7d
SQLITE_PATH=~/finanzas_personales.db
```

- [ ] **Step 5: Copiar `.env.example` a `.env` y levantar Postgres de desarrollo**

```bash
cp .env.example .env
docker run --name finanzas-pg-dev -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=finanzas -p 5432:5432 -d postgres:16-alpine
```

- [ ] **Step 6: Instalar dependencias**

```bash
npm install express cors dotenv jsonwebtoken bcrypt @prisma/client
npm install -D typescript tsx prisma vitest supertest @types/express @types/cors @types/jsonwebtoken @types/bcrypt @types/node @types/supertest better-sqlite3 @types/better-sqlite3 pg @types/pg
```

Expected: se genera `package-lock.json`.

- [ ] **Step 7: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/index.ts package.json package-lock.json tsconfig.json .gitignore .env.example
git commit -m "chore: scaffold del proyecto finanzas-api"
```

---

### Task 2: Esquema Prisma + infraestructura de test

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `.env` (agregar `DATABASE_URL`)
- Create: `vitest.config.ts`
- Create: `tests/global-setup.ts`
- Create: `tests/setup.ts`
- Create: `src/prisma.ts`

**Interfaces:**
- Produces: schema con modelos `Usuario`, `Periodo`, `Ingreso`, `Gasto`, `Deuda`; cliente `prisma` (default export) singleton; migración inicial `init`; helper de test que aísla la BD `finanzas_test`.

- [ ] **Step 1: Escribir `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Usuario {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
}

model Periodo {
  id       Int       @id @default(autoincrement())
  mes      String
  anio     Int
  ingresos Ingreso[]
  gastos   Gasto[]

  @@unique([mes, anio])
}

model Ingreso {
  id        Int      @id @default(autoincrement())
  fuente    String
  valor     Int
  periodoId Int
  periodo   Periodo  @relation(fields: [periodoId], references: [id], onDelete: Cascade)
}

model Gasto {
  id        Int      @id @default(autoincrement())
  concepto  String
  valor     Int
  nota      String?
  pagado    Boolean  @default(false)
  deudaId   Int?
  deuda     Deuda?   @relation(fields: [deudaId], references: [id], onDelete: SetNull)
  periodoId Int
  periodo   Periodo  @relation(fields: [periodoId], references: [id], onDelete: Cascade)
}

model Deuda {
  id          Int      @id @default(autoincrement())
  nombre      String
  montoTotal  Int
  descripcion String?
  gastos      Gasto[]
}
```

- [ ] **Step 2: Generar la migración inicial**

Run: `npx prisma migrate dev --name init`
Expected: migración aplicada a `finanzas` y cliente generado.

- [ ] **Step 3: Crear `src/prisma.ts` (cliente singleton)**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: Escribir el test que falla (el test crea y lee un Periodo)**

```ts
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/prisma";

beforeEach(async () => {
  await prisma.ingreso.deleteMany();
  await prisma.gasto.deleteMany();
  await prisma.deuda.deleteMany();
  await prisma.periodo.deleteMany();
  await prisma.usuario.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("prisma", () => {
  it("crea y lee un periodo", async () => {
    await prisma.periodo.create({ data: { mes: "Enero", anio: 2026 } });
    const p = await prisma.periodo.findUnique({
      where: { mes_anio: { mes: "Enero", anio: 2026 } },
    });
    expect(p).not.toBeNull();
    expect(p!.anio).toBe(2026);
  });
});
```

- [ ] **Step 5: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
  },
});
```

- [ ] **Step 6: Crear `tests/global-setup.ts` (crea la BD de test y aplica migraciones)**

```ts
import { execSync } from "node:child_process";
import { Client } from "pg";

const ADMIN_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/postgres";
const TEST_DB = "finanzas_test";

export default async function setup() {
  const client = new Client({ connectionString: ADMIN_URL });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await client.query(`CREATE DATABASE ${TEST_DB}`);
  await client.end();

  const testUrl = ADMIN_URL.replace("/postgres", `/${TEST_DB}`);
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "inherit",
  });
  process.env.DATABASE_URL = testUrl;
}
```

- [ ] **Step 7: Crear `tests/setup.ts` (limpieza entre tests, reutilizada por todas las suites)**

```ts
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
```

- [ ] **Step 8: Ejecutar el test**

Run: `npm test -- tests/prisma.test.ts`
Expected: PASS (Postgres de Docker debe estar corriendo).

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma src/prisma.ts vitest.config.ts tests/global-setup.ts tests/setup.ts tests/prisma.test.ts
git commit -m "feat: agregar esquema Prisma e infraestructura de test"
```

---

### Task 3: App Express + config + manejo de errores + health

**Files:**
- Create: `src/config.ts`
- Create: `src/middleware/error.ts`
- Create: `src/app.ts`
- Create: `src/index.ts`
- Create: `tests/app.test.ts`

**Interfaces:**
- Produces:
  - `config` (`{ port, jwtSecret, jwtExpiresIn }`) — falla al arrancar si falta `JWT_SECRET`.
  - `class AppError` (`constructor(status: number, message: string)`) — usado por todos los services de tareas posteriores.
  - `function errorHandler(err, _req, res, _next)` — middleware final.
  - `function notFound(_req, res)` — 404 para rutas desconocidas.
  - `function createApp(): express.Express` — app sin escuchar; usada por supertest en tareas posteriores.

- [ ] **Step 1: Escribir el test que falla**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();

describe("app", () => {
  it("responde ok en /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("responde 404 con {error} en rutas desconocidas", async () => {
    const res = await request(app).get("/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- tests/app.test.ts`
Expected: FAIL (no existe `src/app.ts`).

- [ ] **Step 3: Crear `src/config.ts`**

```ts
import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
};
```

- [ ] **Step 4: Crear `src/middleware/error.ts`**

```ts
import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
```

- [ ] **Step 5: Crear `src/app.ts`**

```ts
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Crear `src/index.ts`**

```ts
import { createApp } from "./app";
import { config } from "./config";
import { prisma } from "./prisma";

async function main() {
  await prisma.$connect();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API escuchando en http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 7: Ejecutar para verlo pasar**

Run: `npm test -- tests/app.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add src/config.ts src/middleware/error.ts src/app.ts src/index.ts tests/app.test.ts
git commit -m "feat: agregar app Express con health, 404 y manejo de errores"
```

---

### Task 4: Autenticación — servicio, login, middleware JWT

**Files:**
- Create: `src/services/auth.service.ts`
- Create: `src/middleware/auth.ts`
- Create: `src/routes/auth.routes.ts`
- Create: `scripts/create-user.ts`
- Modify: `src/app.ts` (montar `/auth`)
- Create: `tests/auth.test.ts`
- Create: `tests/helpers.ts`

**Interfaces:**
- Consumes: `AppError` (Task 3), `prisma` (Task 2), `config` (Task 3).
- Produces:
  - `hashPassword(password: string): Promise<string>`
  - `verifyPassword(password: string, hash: string): Promise<boolean>`
  - `signToken(userId: number): string` (JWT con `sub`)
  - `verifyToken(token: string): { sub: number }`
  - `login(email: string, password: string): Promise<{ token: string; user: { id: number; email: string } }>` — lanza `AppError(401)` si credenciales inválidas.
  - `requireAuth(req: AuthRequest, res, next)` middleware; `interface AuthRequest extends Request { userId?: number }`.
  - `createTestUser(): Promise<string>` (helper de test, devuelve token).
  - `POST /auth/login`, `GET /auth/me` (devuelve `{ id, email }`, requiere token).

- [ ] **Step 1: Escribir el test que falla**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { hashPassword } from "../src/services/auth.service";
import { createTestUser } from "./helpers";

const app = createApp();

describe("auth", () => {
  it("login con credenciales válidas devuelve token y usuario", async () => {
    await prisma.usuario.create({
      data: { email: "yo@example.com", password: await hashPassword("secreto") },
    });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "yo@example.com", password: "secreto" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("yo@example.com");
  });

  it("login con password incorrecta devuelve 401", async () => {
    await prisma.usuario.create({
      data: { email: "yo@example.com", password: await hashPassword("secreto") },
    });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "yo@example.com", password: "malo" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

it("una ruta protegida rechaza sin token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("una ruta protegida acepta token válido", async () => {
    const token = await createTestUser();
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test@test.com");
  });
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- tests/auth.test.ts`
Expected: FAIL (login → 404, rutas faltantes).

- [ ] **Step 3: Crear `src/services/auth.service.ts`**

```ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "../middleware/error";
import { prisma } from "../prisma";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyToken(token: string): { sub: number } {
  return jwt.verify(token, config.jwtSecret) as { sub: number };
}

export async function login(email: string, password: string) {
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) throw new AppError(401, "Credenciales inválidas");
  const ok = await verifyPassword(password, user.password);
  if (!ok) throw new AppError(401, "Credenciales inválidas");
  return {
    token: signToken(user.id),
    user: { id: user.id, email: user.email },
  };
}
```

- [ ] **Step 4: Crear `src/middleware/auth.ts`**

```ts
import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error";
import { verifyToken } from "../services/auth.service";

export interface AuthRequest extends Request {
  userId?: number;
}

export function requireAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "Token requerido"));
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, "Token inválido o expirado"));
  }
}
```

- [ ] **Step 5: Crear `src/routes/auth.routes.ts`**

```ts
import { Router } from "express";
import { AppError } from "../middleware/error";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { login } from "../services/auth.service";
import { prisma } from "../prisma";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: unknown;
      password?: unknown;
    };
    if (typeof email !== "string" || typeof password !== "string") {
      throw new AppError(400, "email y password son requeridos");
    }
    const result = await login(email.trim().toLowerCase(), password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.userId! },
      select: { id: true, email: true },
    });
    if (!user) throw new AppError(404, "Usuario no encontrado");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 6: Montar rutas en `src/app.ts`**

```ts
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 7: Crear `tests/helpers.ts`**

```ts
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
```

- [ ] **Step 8: Crear `scripts/create-user.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/services/auth.service";

function readArg(flag: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  return arg?.split("=")[1];
}

async function main() {
  const email = readArg("--email")?.trim().toLowerCase();
  const password = readArg("--password");
  if (!email || !password) {
    console.error("Uso: npm run create-user -- --email=tu@email.com --password=secreto");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const hashed = await hashPassword(password);
    const user = await prisma.usuario.upsert({
      where: { email },
      update: { password: hashed },
      create: { email, password: hashed },
    });
    console.log(`Usuario listo: ${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 9: Ejecutar para verlo pasar**

Run: `npm test -- tests/auth.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 10: Commit**

```bash
git add src/services/auth.service.ts src/middleware/auth.ts src/routes/auth.routes.ts scripts/create-user.ts src/app.ts tests/auth.test.ts tests/helpers.ts
git commit -m "feat: agregar autenticación JWT y login"
```

---

### Task 5: Periodos — service, rutas

**Files:**
- Create: `src/validators.ts`
- Create: `src/services/periodos.service.ts`
- Create: `src/routes/periodos.routes.ts`
- Modify: `src/app.ts` (montar `/periodos`)
- Create: `tests/periodos.test.ts`

**Interfaces:**
- Consumes: `AppError` (Task 3), `prisma` (Task 2), `requireAuth` + `AuthRequest` (Task 4), `createTestUser`/`seedPeriodo` (Task 4 helpers).
- Produces:
  - `MESES: string[]` — constante pública.
  - `parseMesAnio(mes: unknown, anio: unknown): { mes: string; anio: number }` — lanza `AppError(400)`.
  - `parseMonto(v: unknown): number` — entero ≥ 0, `AppError(400)`.
  - `parseRequeridoTexto(v: unknown, campo: string): string` — trim + upper, `AppError(400)`.
  - `listPeriodos(): Promise<Array<{ mes; anio; totalIngresos; totalGastos; totalPendiente; restante }>>`
  - `createPeriodo(mes: string, anio: number)` — `AppError(409)` si duplicado (Prisma P2002).
  - `deletePeriodo(mes: string, anio: number)` — `AppError(404)` si no existe.
  - `GET /periodos`, `POST /periodos`, `DELETE /periodos/:mes/:anio`.

- [ ] **Step 1: Escribir el test que falla**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("periodos", () => {
  it("lista periodos con resumen calculado", async () => {
    await seedPeriodo("Enero", 2026);
    const p = await prisma.periodo.findUnique({
      where: { mes_anio: { mes: "Enero", anio: 2026 } },
    });
    await prisma.ingreso.create({ data: { fuente: "SALARIO", valor: 2000000, periodoId: p!.id } });
    await prisma.gasto.create({ data: { concepto: "ARRIENDO", valor: 800000, pagado: true, periodoId: p!.id } });
    await prisma.gasto.create({ data: { concepto: "SERVICIOS", valor: 200000, pagado: false, periodoId: p!.id } });

    const token = await authToken();
    const res = await request(app)
      .get("/periodos")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual({
      mes: "Enero",
      anio: 2026,
      totalIngresos: 2000000,
      totalGastos: 800000,
      totalPendiente: 200000,
      restante: 1200000,
    });
  });

  it("crea un periodo", async () => {
    const token = await authToken();
    const res = await request(app)
      .post("/periodos")
      .set("Authorization", `Bearer ${token}`)
      .send({ mes: "Febrero", anio: 2026 });
    expect(res.status).toBe(201);
  });

  it("rechaza periodo duplicado con 409", async () => {
    await seedPeriodo("Enero", 2026);
    const token = await authToken();
    const res = await request(app)
      .post("/periodos")
      .set("Authorization", `Bearer ${token}`)
      .send({ mes: "Enero", anio: 2026 });
    expect(res.status).toBe(409);
  });

  it("borra un periodo y sus registros en cascada", async () => {
    const p = await seedPeriodo("Enero", 2026);
    await prisma.ingreso.create({ data: { fuente: "SALARIO", valor: 1000000, periodoId: p.id } });

    const token = await authToken();
    const res = await request(app)
      .delete("/periodos/Enero/2026")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    const count = await prisma.periodo.count();
    expect(count).toBe(0);
    const ing = await prisma.ingreso.count();
    expect(ing).toBe(0);
  });

  it("devuelve 404 al borrar periodo inexistente", async () => {
    const token = await authToken();
    const res = await request(app)
      .delete("/periodos/Enero/2020")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- tests/periodos.test.ts`
Expected: FAIL (rutas no existen → 404).

- [ ] **Step 3: Crear `src/validators.ts`**

```ts
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
```

- [ ] **Step 4: Crear `src/services/periodos.service.ts`**

```ts
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
```

- [ ] **Step 5: Crear `src/routes/periodos.routes.ts`**

```ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createPeriodo,
  deletePeriodo,
  listPeriodos,
} from "../services/periodos.service";
import { parseMesAnio } from "../validators";

const router = Router();

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    res.json(await listPeriodos());
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.body.mes, req.body.anio);
    const periodo = await createPeriodo(mes, anio);
    res.status(201).json(periodo);
  } catch (err) {
    next(err);
  }
});

router.delete("/:mes/:anio", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    await deletePeriodo(mes, anio);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 6: Montar en `src/app.ts`**

```ts
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";
import periodosRoutes from "./routes/periodos.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use("/periodos", periodosRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 7: Ejecutar para verlo pasar**

Run: `npm test -- tests/periodos.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 8: Commit**

```bash
git add src/validators.ts src/services/periodos.service.ts src/routes/periodos.routes.ts src/app.ts tests/periodos.test.ts
git commit -m "feat: agregar CRUD de periodos con resumen mensual"
```

---

### Task 6: Ingresos — service, rutas

**Files:**
- Create: `src/services/ingresos.service.ts`
- Create: `src/routes/ingresos.routes.ts`
- Modify: `src/app.ts` (montar rutas de ingresos)
- Create: `tests/ingresos.test.ts`

**Interfaces:**
- Consumes: `getPeriodoOrThrow` (Task 5), `parseMesAnio`/`parseMonto`/`parseRequeridoTexto` (Task 5), `requireAuth` (Task 4).
- Produces:
  - `listIngresos(mes, anio): Promise<Array<{ id; fuente; valor }>>`
  - `createIngreso(mes, anio, fuente, valor)` — `AppError(404)` si no existe el periodo.
  - `updateIngreso(id, fuente, valor)` — `AppError(404)` si no existe.
  - `deleteIngreso(id)` — `AppError(404)` si no existe.
  - `GET/POST /periodos/:mes/:anio/ingresos`, `PUT/DELETE /ingresos/:id`.

- [ ] **Step 1: Escribir el test que falla**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("ingresos", () => {
  it("lista los ingresos del periodo", async () => {
    const p = await seedPeriodo("Enero", 2026);
    await prisma.ingreso.create({ data: { fuente: "SALARIO", valor: 2000000, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .get("/periodos/Enero/2026/ingresos")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ fuente: "SALARIO", valor: 2000000 });
  });

  it("crea un ingreso en el periodo", async () => {
    await seedPeriodo("Enero", 2026);
    const token = await authToken();
    const res = await request(app)
      .post("/periodos/Enero/2026/ingresos")
      .set("Authorization", `Bearer ${token}`)
      .send({ fuente: "BONO", valor: 500000 });
    expect(res.status).toBe(201);
  });

  it("rechaza crear ingreso en periodo inexistente con 404", async () => {
    const token = await authToken();
    const res = await request(app)
      .post("/periodos/Enero/2020/ingresos")
      .set("Authorization", `Bearer ${token}`)
      .send({ fuente: "X", valor: 1000 });
    expect(res.status).toBe(404);
  });

  it("actualiza un ingreso", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const ing = await prisma.ingreso.create({ data: { fuente: "A", valor: 100, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .put(`/ingresos/${ing.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fuente: "B", valor: 200 });
    expect(res.status).toBe(200);
    const updated = await prisma.ingreso.findUnique({ where: { id: ing.id } });
    expect(updated!.valor).toBe(200);
  });

  it("elimina un ingreso", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const ing = await prisma.ingreso.create({ data: { fuente: "A", valor: 100, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .delete(`/ingresos/${ing.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(await prisma.ingreso.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- tests/ingresos.test.ts`
Expected: FAIL (rutas → 404).

- [ ] **Step 3: Crear `src/services/ingresos.service.ts`**

```ts
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
```

- [ ] **Step 4: Crear `src/routes/ingresos.routes.ts`**

```ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createIngreso,
  deleteIngreso,
  listIngresos,
  updateIngreso,
} from "../services/ingresos.service";
import {
  parseMesAnio,
  parseMonto,
  parseRequeridoTexto,
} from "../validators";

const router = Router();

router.get("/periodos/:mes/:anio/ingresos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await listIngresos(mes, anio));
  } catch (err) {
    next(err);
  }
});

router.post("/periodos/:mes/:anio/ingresos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    const fuente = parseRequeridoTexto(req.body.fuente, "Fuente");
    const valor = parseMonto(req.body.valor);
    const ingreso = await createIngreso(mes, anio, fuente, valor);
    res.status(201).json(ingreso);
  } catch (err) {
    next(err);
  }
});

router.put("/ingresos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const fuente = parseRequeridoTexto(req.body.fuente, "Fuente");
    const valor = parseMonto(req.body.valor);
    res.json(await updateIngreso(id, fuente, valor));
  } catch (err) {
    next(err);
  }
});

router.delete("/ingresos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteIngreso(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 5: Montar en `src/app.ts`**

```ts
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";
import ingresosRoutes from "./routes/ingresos.routes";
import periodosRoutes from "./routes/periodos.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use("/", ingresosRoutes);
  app.use("/periodos", periodosRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Ejecutar para verlo pasar**

Run: `npm test -- tests/ingresos.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add src/services/ingresos.service.ts src/routes/ingresos.routes.ts src/app.ts tests/ingresos.test.ts
git commit -m "feat: agregar CRUD de ingresos"
```

---

### Task 7: Gastos — service, rutas

**Files:**
- Create: `src/services/gastos.service.ts`
- Create: `src/routes/gastos.routes.ts`
- Modify: `src/app.ts` (montar rutas de gastos)
- Create: `tests/gastos.test.ts`

**Interfaces:**
- Consumes: `getPeriodoOrThrow` (Task 5), `parseMesAnio`/`parseMonto`/`parseRequeridoTexto`/`parseNota`/`parsePagado` (Task 5), `requireAuth` (Task 4).
- Produces:
  - `listGastos(mes, anio): Promise<Array<{ id; concepto; valor; nota; pagado; deudaId; deudaNombre }>>`
  - `createGasto(mes, anio, data: { concepto; valor; nota?; pagado?; deudaId? })`
  - `updateGasto(id, data)` — `AppError(404)` si no existe.
  - `deleteGasto(id)` — `AppError(404)` si no existe.
  - `GET/POST /periodos/:mes/:anio/gastos`, `PUT/DELETE /gastos/:id`.

- [ ] **Step 1: Escribir el test que falla**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("gastos", () => {
  it("lista gastos del periodo con nombre de deuda", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const deuda = await prisma.deuda.create({ data: { nombre: "TARJETA", montoTotal: 5000000 } });
    await prisma.gasto.create({
      data: { concepto: "CUOTA", valor: 300000, pagado: true, deudaId: deuda.id, periodoId: p.id },
    });
    const token = await authToken();
    const res = await request(app)
      .get("/periodos/Enero/2026/gastos")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ concepto: "CUOTA", valor: 300000, pagado: true, deudaNombre: "TARJETA" });
  });

  it("crea un gasto pagado en el periodo", async () => {
    await seedPeriodo("Enero", 2026);
    const token = await authToken();
    const res = await request(app)
      .post("/periodos/Enero/2026/gastos")
      .set("Authorization", `Bearer ${token}`)
      .send({ concepto: "ARRIENDO", valor: 800000, pagado: true });
    expect(res.status).toBe(201);
    expect(res.body.pagado).toBe(true);
  });

  it("actualiza pagado de un gasto", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const g = await prisma.gasto.create({ data: { concepto: "X", valor: 100, pagado: false, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .put(`/gastos/${g.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ concepto: "X", valor: 100, pagado: true });
    expect(res.status).toBe(200);
    expect(res.body.pagado).toBe(true);
  });

  it("elimina un gasto", async () => {
    const p = await seedPeriodo("Enero", 2026);
    const g = await prisma.gasto.create({ data: { concepto: "X", valor: 100, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .delete(`/gastos/${g.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(await prisma.gasto.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- tests/gastos.test.ts`
Expected: FAIL (rutas → 404).

- [ ] **Step 3: Crear `src/services/gastos.service.ts`**

```ts
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
```

- [ ] **Step 4: Crear `src/routes/gastos.routes.ts`**

```ts
import { Router } from "express";
import { AppError } from "../middleware/error";
import { requireAuth } from "../middleware/auth";
import {
  createGasto,
  deleteGasto,
  listGastos,
  updateGasto,
} from "../services/gastos.service";
import {
  parseMesAnio,
  parseMonto,
  parseNota,
  parsePagado,
  parseRequeridoTexto,
} from "../validators";

const router = Router();

router.get("/periodos/:mes/:anio/gastos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await listGastos(mes, anio));
  } catch (err) {
    next(err);
  }
});

router.post("/periodos/:mes/:anio/gastos", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    const concepto = parseRequeridoTexto(req.body.concepto, "Concepto");
    const valor = parseMonto(req.body.valor);
    const nota = parseNota(req.body.nota);
    const pagado = req.body.pagado === undefined ? false : parsePagado(req.body.pagado);
    let deudaId: number | null = null;
    if (req.body.deudaId !== undefined && req.body.deudaId !== null) {
      if (typeof req.body.deudaId !== "number" || !Number.isInteger(req.body.deudaId)) {
        throw new AppError(400, "deudaId inválido");
      }
      deudaId = req.body.deudaId;
    }
    const gasto = await createGasto(mes, anio, { concepto, valor, nota, pagado, deudaId });
    res.status(201).json(gasto);
  } catch (err) {
    next(err);
  }
});

router.put("/gastos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const concepto = parseRequeridoTexto(req.body.concepto, "Concepto");
    const valor = parseMonto(req.body.valor);
    const nota = parseNota(req.body.nota);
    const pagado = req.body.pagado === undefined ? false : parsePagado(req.body.pagado);
    let deudaId: number | null = null;
    if (req.body.deudaId !== undefined && req.body.deudaId !== null) {
      if (typeof req.body.deudaId !== "number" || !Number.isInteger(req.body.deudaId)) {
        throw new AppError(400, "deudaId inválido");
      }
      deudaId = req.body.deudaId;
    }
    const gasto = await updateGasto(id, { concepto, valor, nota, pagado, deudaId });
    res.json(gasto);
  } catch (err) {
    next(err);
  }
});

router.delete("/gastos/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteGasto(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 5: Montar en `src/app.ts`**

```ts
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";
import gastosRoutes from "./routes/gastos.routes";
import ingresosRoutes from "./routes/ingresos.routes";
import periodosRoutes from "./routes/periodos.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use("/", gastosRoutes);
  app.use("/", ingresosRoutes);
  app.use("/periodos", periodosRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Ejecutar para verlo pasar**

Run: `npm test -- tests/gastos.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/services/gastos.service.ts src/routes/gastos.routes.ts src/app.ts tests/gastos.test.ts
git commit -m "feat: agregar CRUD de gastos"
```

---

### Task 8: Deudas — service, rutas

**Files:**
- Create: `src/services/deudas.service.ts`
- Create: `src/routes/deudas.routes.ts`
- Modify: `src/app.ts` (montar `/deudas`)
- Create: `tests/deudas.test.ts`

**Interfaces:**
- Consumes: `parseMonto`/`parseRequeridoTexto` (Task 5), `requireAuth` (Task 4), `AppError` (Task 3).
- Produces:
  - `listDeudas(): Promise<Array<{ id; nombre; montoTotal; descripcion; abonado; pendiente; pct }>>`
  - `createDeuda(nombre, montoTotal, descripcion)`
  - `updateDeuda(id, nombre, montoTotal, descripcion)` — `AppError(404)`.
  - `deleteDeuda(id)` — `AppError(404)`.
  - `GET/POST /deudas`, `PUT/DELETE /deudas/:id`.

- [ ] **Step 1: Escribir el test que falla**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("deudas", () => {
  it("lista deudas con abonado, pendiente y pct", async () => {
    const deuda = await prisma.deuda.create({ data: { nombre: "TARJETA", montoTotal: 1000000 } });
    const p = await seedPeriodo("Enero", 2026);
    await prisma.gasto.create({ data: { concepto: "CUOTA 1", valor: 300000, pagado: true, deudaId: deuda.id, periodoId: p.id } });
    await prisma.gasto.create({ data: { concepto: "CUOTA 2", valor: 200000, pagado: true, deudaId: deuda.id, periodoId: p.id } });
    await prisma.gasto.create({ data: { concepto: "CUOTA 3", valor: 100000, pagado: false, deudaId: deuda.id, periodoId: p.id } });

    const token = await authToken();
    const res = await request(app)
      .get("/deudas")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual({
      id: deuda.id,
      nombre: "TARJETA",
      montoTotal: 1000000,
      descripcion: null,
      abonado: 500000,
      pendiente: 500000,
      pct: 50,
    });
  });

  it("no deja que pct supere 100", async () => {
    const deuda = await prisma.deuda.create({ data: { nombre: "X", montoTotal: 100 } });
    const p = await seedPeriodo("Enero", 2026);
    await prisma.gasto.create({ data: { concepto: "Y", valor: 300, pagado: true, deudaId: deuda.id, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .get("/deudas")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body[0].pct).toBe(100);
    expect(res.body[0].pendiente).toBe(0);
  });

  it("crea y actualiza una deuda", async () => {
    const token = await authToken();
    const created = await request(app)
      .post("/deudas")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "PRESTAMO", montoTotal: 5000000 });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .put(`/deudas/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "PRESTAMO PAPI", montoTotal: 4500000, descripcion: "En dólares" });
    expect(updated.status).toBe(200);
    expect(updated.body.nombre).toBe("PRESTAMO PAPI");
  });

  it("borrar una deuda deja sus gastos sin deuda", async () => {
    const deuda = await prisma.deuda.create({ data: { nombre: "X", montoTotal: 100 } });
    const p = await seedPeriodo("Enero", 2026);
    const g = await prisma.gasto.create({ data: { concepto: "Y", valor: 50, pagado: true, deudaId: deuda.id, periodoId: p.id } });
    const token = await authToken();
    const res = await request(app)
      .delete(`/deudas/${deuda.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    const gasto = await prisma.gasto.findUnique({ where: { id: g.id } });
    expect(gasto!.deudaId).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- tests/deudas.test.ts`
Expected: FAIL (rutas → 404).

- [ ] **Step 3: Crear `src/services/deudas.service.ts`**

```ts
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
```

- [ ] **Step 4: Crear `src/routes/deudas.routes.ts`**

```ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createDeuda,
  deleteDeuda,
  listDeudas,
  updateDeuda,
} from "../services/deudas.service";
import { parseMonto, parseRequeridoTexto } from "../validators";
import { parseNota } from "../validators";

const router = Router();

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    res.json(await listDeudas());
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const nombre = parseRequeridoTexto(req.body.nombre, "Nombre");
    const montoTotal = parseMonto(req.body.montoTotal);
    const descripcion = parseNota(req.body.descripcion);
    const deuda = await createDeuda(nombre, montoTotal, descripcion);
    res.status(201).json(deuda);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const nombre = parseRequeridoTexto(req.body.nombre, "Nombre");
    const montoTotal = parseMonto(req.body.montoTotal);
    const descripcion = parseNota(req.body.descripcion);
    res.json(await updateDeuda(id, nombre, montoTotal, descripcion));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteDeuda(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 5: Montar en `src/app.ts`**

```ts
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";
import deudasRoutes from "./routes/deudas.routes";
import gastosRoutes from "./routes/gastos.routes";
import ingresosRoutes from "./routes/ingresos.routes";
import periodosRoutes from "./routes/periodos.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use("/deudas", deudasRoutes);
  app.use("/", gastosRoutes);
  app.use("/", ingresosRoutes);
  app.use("/periodos", periodosRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Ejecutar para verlo pasar**

Run: `npm test -- tests/deudas.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/services/deudas.service.ts src/routes/deudas.routes.ts src/app.ts tests/deudas.test.ts
git commit -m "feat: agregar CRUD de deudas con progreso"
```

---

### Task 9: Resumen — service, ruta

**Files:**
- Create: `src/services/resumen.service.ts`
- Create: `src/routes/resumen.routes.ts`
- Modify: `src/app.ts` (montar rutas de resumen)
- Create: `tests/resumen.test.ts`

**Interfaces:**
- Consumes: `getPeriodoOrThrow` (Task 5), `parseMesAnio` (Task 5), `requireAuth` (Task 4).
- Produces:
  - `getResumen(mes, anio): Promise<{ totalIngresos; totalGastos; totalPendiente; restante; ingresos: Array<{ id; fuente; valor }>; gastos: Array<{ id; concepto; valor; nota; pagado; deudaId; deudaNombre }> }>`
  - `GET /periodos/:mes/:anio/resumen`.

- [ ] **Step 1: Escribir el test que falla**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { createTestUser, seedPeriodo } from "./helpers";

const app = createApp();

async function authToken() {
  return createTestUser();
}

describe("resumen", () => {
  it("devuelve totales y detalle del mes", async () => {
    const p = await seedPeriodo("Enero", 2026);
    await prisma.ingreso.create({ data: { fuente: "SALARIO", valor: 2000000, periodoId: p.id } });
    await prisma.gasto.create({ data: { concepto: "ARRIENDO", valor: 800000, pagado: true, periodoId: p.id } });
    await prisma.gasto.create({ data: { concepto: "SERVICIOS", valor: 200000, pagado: false, periodoId: p.id } });

    const token = await authToken();
    const res = await request(app)
      .get("/periodos/Enero/2026/resumen")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalIngresos: 2000000,
      totalGastos: 800000,
      totalPendiente: 200000,
      restante: 1200000,
    });
    expect(res.body.ingresos).toHaveLength(1);
    expect(res.body.gastos).toHaveLength(2);
  });

  it("devuelve 404 para un periodo inexistente", async () => {
    const token = await authToken();
    const res = await request(app)
      .get("/periodos/Enero/2020/resumen")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- tests/resumen.test.ts`
Expected: FAIL (ruta → 404).

- [ ] **Step 3: Crear `src/services/resumen.service.ts`**

```ts
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
```

- [ ] **Step 4: Crear `src/routes/resumen.routes.ts`**

```ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getResumen } from "../services/resumen.service";
import { parseMesAnio } from "../validators";

const router = Router();

router.get("/periodos/:mes/:anio/resumen", requireAuth, async (req, res, next) => {
  try {
    const { mes, anio } = parseMesAnio(req.params.mes, req.params.anio);
    res.json(await getResumen(mes, anio));
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 5: Montar en `src/app.ts`**

```ts
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/error";
import authRoutes from "./routes/auth.routes";
import deudasRoutes from "./routes/deudas.routes";
import gastosRoutes from "./routes/gastos.routes";
import ingresosRoutes from "./routes/ingresos.routes";
import periodosRoutes from "./routes/periodos.routes";
import resumenRoutes from "./routes/resumen.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use("/deudas", deudasRoutes);
  app.use("/", resumenRoutes);
  app.use("/", gastosRoutes);
  app.use("/", ingresosRoutes);
  app.use("/periodos", periodosRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Ejecutar para verlo pasar**

Run: `npm test -- tests/resumen.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Correr toda la suite para verificar integración**

Run: `npm test`
Expected: PASS (todas las suites).

- [ ] **Step 8: Commit**

```bash
git add src/services/resumen.service.ts src/routes/resumen.routes.ts src/app.ts tests/resumen.test.ts
git commit -m "feat: agregar endpoint de resumen mensual"
```

---

### Task 10: Migración de datos SQLite → PostgreSQL

**Files:**
- Create: `scripts/migrate-from-sqlite.ts`
- Create: `tests/migrate-from-sqlite.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2).
- Produces: script `npm run migrate:sqlite` que copia `periodos`, `ingresos`, `gastos`, `deudas` desde un SQLite (`SQLITE_PATH`, default `~/finanzas_personales.db`) a la BD de Prisma. Idempotente: si la BD destino ya tiene periodos, se detiene sin duplicar.

- [ ] **Step 1: Escribir el test que falla (usa una BD SQLite de fixture)**

```ts
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
```

- [ ] **Step 2: Ejecutar para verlo fallar**

Run: `npm test -- tests/migrate-from-sqlite.test.ts`
Expected: FAIL (no existe el módulo de migración).

- [ ] **Step 3: Crear `scripts/migrate-from-sqlite.ts` (exporta `migrate` para poder testear)**

```ts
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
```

- [ ] **Step 4: Ejecutar para verlo pasar**

Run: `npm test -- tests/migrate-from-sqlite.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Ejecutar typecheck**

Run: `npm run typecheck`
Expected: sin errores (scripts se excluyen del build pero tsx los corre igual).

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-from-sqlite.ts tests/migrate-from-sqlite.test.ts
git commit -m "feat: agregar script de migración de SQLite a PostgreSQL"
```

---

### Task 11: Docker + Dokploy + README

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `dokploy.json`
- Create: `README.md`

**Interfaces:**
- Produces: imagen Docker multi-stage que compila TS y corre `dist/index.js` con `node:20-alpine`; config Dokploy; README con pasos de despliegue y uso.

- [ ] **Step 1: Crear `Dockerfile`**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY --from=build /app/dist ./dist
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Crear `.dockerignore`**

```
node_modules
dist
.env
*.log
tests
scripts
docs
.git
```

- [ ] **Step 3: Verificar que la imagen compila**

Run: `docker build -t finanzas-api .`
Expected: build exitoso (debe poder conectarse solo al arrancar, no al construir).

- [ ] **Step 4: Crear `dokploy.json`**

```json
{
  "name": "finanzas-api",
  "description": "Finanzas Personales API",
  "type": "docker",
  "buildType": "dockerfile",
  "dockerfilePath": "Dockerfile"
}
```

Nota: en Dokploy se configuran en el panel: la URL del repositorio, el branch, la ruta del Dockerfile, el dominio/subdominio y las variables de entorno `DATABASE_URL`, `JWT_SECRET`, `PORT`. La base de datos Postgres se crea como servicio en Dokploy y su conexión se expone vía `DATABASE_URL`.

- [ ] **Step 5: Crear `README.md`**

```markdown
# Finanzas Personales API

API REST para el manejo de finanzas personales (ingresos, gastos, deudas y periodos mensuales). Construida con Node.js + TypeScript + Express + Prisma + PostgreSQL.

## Requisitos

- Node.js 20+
- PostgreSQL (o Docker)
- Docker (para el despliegue)

## Desarrollo

```bash
cp .env.example .env
docker run --name finanzas-pg-dev -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=finanzas -p 5432:5432 -d postgres:16-alpine
npm install
npx prisma migrate dev
npm run create-user -- --email=tu@email.com --password=tu-password
npm run dev
```

## Pruebas

```bash
npm test
npm run typecheck
```

## Migrar datos desde la app Python

```bash
# apunta SQLITE_PATH al archivo de la app original (default ~/finanzas_personales.db)
npm run migrate:sqlite
```

## Despliegue (Dokploy)

1. Crea un servicio tipo Docker en Dokploy apuntando al repositorio.
2. Define el Dockerfile (el de la raíz).
3. Crea una base de datos PostgreSQL en Dokploy.
4. Configura las variables de entorno:
   - `DATABASE_URL` (conexión a la BD de Dokploy)
   - `JWT_SECRET` (secreto largo aleatorio)
   - `PORT` (3000)
5. En el panel, asigna el subdominio (HTTPS automático).
6. Tras el primer deploy, ejecuta `npm run prisma:migrate` y crea tu usuario:
   ```bash
   npm run create-user -- --email=tu@email.com --password=tu-password
   ```
7. (Opcional) Migra tu historial: `npm run migrate:sqlite`.

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Login, devuelve JWT |
| GET | `/periodos` | Meses con resumen |
| POST | `/periodos` | Crear mes |
| DELETE | `/periodos/:mes/:anio` | Borrar mes en cascada |
| GET/POST | `/periodos/:mes/:anio/ingresos` | Ingresos del mes |
| PUT/DELETE | `/ingresos/:id` | Actualizar/eliminar ingreso |
| GET/POST | `/periodos/:mes/:anio/gastos` | Gastos del mes |
| PUT/DELETE | `/gastos/:id` | Actualizar/eliminar gasto |
| GET/POST | `/deudas` | Listar/crear deudas |
| PUT/DELETE | `/deudas/:id` | Actualizar/eliminar deuda |
| GET | `/periodos/:mes/:anio/resumen` | Resumen del mes |
```

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore dokploy.json README.md
git commit -m "feat: agregar Dockerfile, config Dokploy y README"
```

---

### Task 12: Verificación final e integración

**Files:**
- None (verificación y documentación de comandos de release).

**Interfaces:**
- Consumes: todo lo construido en tareas 1-11.

- [ ] **Step 1: Correr toda la suite y el typecheck**

Run: `npm test && npm run typecheck`
Expected: todas las suites PASS y typecheck sin errores.

- [ ] **Step 2: Smoke test manual del servidor**

```bash
npm run build && PORT=3000 node dist/index.js
```

Expected: log `API escuchando en http://localhost:3000`. En otra terminal:

```bash
curl -s http://localhost:3000/health
# {"status":"ok"}
```

- [ ] **Step 3: Commit (si queda algo pendiente)**

```bash
git add -A
git commit -m "chore: verificación final de la API"
```