# Diseño — Finanzas Personales API

**Fecha:** 2026-08-18
**Estado:** Aprobado para implementación
**Tipo:** API REST + despliegue en VPS

## Objetivo

Migrar la app de escritorio `Finanzas Personales` (Python + Tkinter + SQLite, un solo archivo) a una **API REST** en Node.js + TypeScript, desplegada en un VPS vía **Dokploy**, con PostgreSQL como base de datos. La API será consumida por futuras aplicaciones de escritorio y móviles (proyectos separados). El único usuario es el dueño de la app.

## Decisiones tomadas

| Decisión | Valor |
|---|---|
| Alcance de esta fase | Solo la API (no clientes desktop/móvil) |
| Framework | Express + TypeScript |
| Capa de datos | Prisma ORM |
| Base de datos | PostgreSQL (servicio gestionado por Dokploy) |
| Autenticación | Login único + JWT (Bearer) |
| Despliegue | Dokploy en VPS, subdominio generado, HTTPS automático |
| Migración de datos | Script que lee `~/finanzas_personales.db` (SQLite) y carga a Postgres |
| Moneda | Enteros COP (sin decimales), igual que la app original |

## Arquitectura

Monolito Express modular con capas separadas:

```
finanzas-api/
├── prisma/
│   └── schema.prisma          # Esquema de datos + migraciones
├── src/
│   ├── index.ts               # Arranque HTTP
│   ├── app.ts                 # Configuración de Express (middlewares, rutas)
│   ├── config.ts              # Variables de entorno (JWT_SECRET, DATABASE_URL, PORT)
│   ├── routes/                # Capa HTTP: valida entrada, define respuestas
│   │   ├── auth.routes.ts
│   │   ├── periodos.routes.ts
│   │   ├── ingresos.routes.ts
│   │   ├── gastos.routes.ts
│   │   ├── deudas.routes.ts
│   │   └── resumen.routes.ts
│   ├── services/              # Capa de negocio
│   │   ├── auth.service.ts
│   │   ├── periodos.service.ts
│   │   ├── ingresos.service.ts
│   │   ├── gastos.service.ts
│   │   ├── deudas.service.ts
│   │   └── resumen.service.ts
│   └── middleware/
│       ├── auth.ts            # Valida JWT
│       └── error.ts           # Handler central de errores
├── scripts/
│   ├── create-user.ts         # Crea el usuario (login inicial)
│   └── migrate-from-sqlite.ts # Migra datos desde la app Python
├── tests/                     # Vitest + supertest
├── Dockerfile                 # Multi-stage: build TS → runtime node:20-alpine
├── dokploy.json               # Config de despliegue Dokploy
├── package.json
└── tsconfig.json
```

**Flujo de datos:** `routes` validan entrada → llaman `services` (toda la lógica de negocio, sin SQL) → Prisma. Valores monetarios siempre enteros COP.

## Modelo de datos (Prisma)

El mes se guarda como texto en español (`"Enero"`…`"Diciembre"`), igual que la app actual, para no romper la migración.

```prisma
model Usuario {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String   // hash bcrypt
  createdAt DateTime @default(now())
}

model Periodo {
  id       Int       @id @default(autoincrement())
  mes      String    // "Enero".."Diciembre"
  anio     Int
  ingresos Ingreso[]
  gastos   Gasto[]
  @@unique([mes, anio])
}

model Ingreso {
  id        Int     @id @default(autoincrement())
  fuente    String
  valor     Int     // COP
  periodoId Int
  periodo   Periodo @relation(fields: [periodoId], references: [id], onDelete: Cascade)
}

model Gasto {
  id        Int      @id @default(autoincrement())
  concepto  String
  valor     Int      // COP
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
  montoTotal  Int      // COP
  descripcion String?
  gastos      Gasto[]
}
```

**Reglas de negocio heredadas:**
- `Periodo` es la fuente de verdad de los meses existentes. Borrar un periodo elimina en cascada sus ingresos y gastos.
- Progreso de deuda: `abonado = Σ valor de gastos con deudaId = X y pagado = true`; `pendiente = max(montoTotal - abonado, 0)`; `pct = min((abonado/montoTotal)*100, 100)`.
- Borrar una deuda deja sus gastos sin deuda asignada (`SET NULL`).
- Restante mensual = `Σ ingresos - Σ gastos pagados`.

## Endpoints

Todas las rutas (excepto login) requieren `Authorization: Bearer <token>`.

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Body `{email, password}` → `{token, user}` |

### Periodos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/periodos` | Lista con resumen por mes: `[{mes, anio, totalIngresos, totalGastos, totalPendiente, restante}]` |
| POST | `/periodos` | Crear `{mes, anio}` (409 si ya existe) |
| DELETE | `/periodos/:mes/:anio` | Borra periodo + ingresos/gastos en cascada |

### Ingresos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/periodos/:mes/:anio/ingresos` | Lista del mes |
| POST | `/periodos/:mes/:anio/ingresos` | Crear `{fuente, valor}` |
| PUT | `/ingresos/:id` | Actualizar |
| DELETE | `/ingresos/:id` | Eliminar |

### Gastos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/periodos/:mes/:anio/gastos` | Lista del mes (incluye `deudaNombre`) |
| POST | `/periodos/:mes/:anio/gastos` | Crear `{concepto, valor, nota?, pagado?, deudaId?}` |
| PUT | `/gastos/:id` | Actualizar |
| DELETE | `/gastos/:id` | Eliminar |

### Deudas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/deudas` | Lista con `{id, nombre, montoTotal, descripcion, abonado, pendiente, pct}` |
| POST | `/deudas` | Crear `{nombre, montoTotal, descripcion?}` |
| PUT | `/deudas/:id` | Actualizar |
| DELETE | `/deudas/:id` | Borra la deuda; gastos asociados quedan sin deuda |

### Resumen
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/periodos/:mes/:anio/resumen` | `{totalIngresos, totalGastos, totalPendiente, restante, ingresos: [...], gastos: [...]}` |

**Convenciones:** respuestas JSON en camelCase; errores `{error: "mensaje"}` con códigos HTTP correctos (400 validación, 401 auth, 404 no existe, 409 conflicto periodo duplicado). IDs numéricos.

## Autenticación

- Login valida email + password (hash bcrypt) y emite un **JWT** con expiración configurable (7 días) firmado con `JWT_SECRET`.
- Middleware `auth.ts` valida el `Bearer` token en rutas protegidas; rechaza con `401`.
- `scripts/create-user.ts` crea el usuario inicial (CLI `npm run create-user -- --email ... --password ...`).
- Las contraseñas nunca se devuelven ni se loguean.

## Migración de datos

`scripts/migrate-from-sqlite.ts` (usa `better-sqlite3`):
1. Lee `~/finanzas_personales.db` (SQLite original) y copia `periodos`, `ingresos`, `gastos`, `deudas` a Postgres vía Prisma, mapeando `deuda_id` (IDs viejos → nuevos).
2. **Idempotente**: no duplica si la BD destino ya tiene datos.
3. Se ejecuta localmente contra la BD remota (o en el VPS) tras el primer deploy.

## Despliegue (Dokploy)

- `Dockerfile` multi-stage: build TypeScript → imagen runtime `node:20-alpine`.
- `dokploy.json` declara el servicio API + dependencia de la BD Postgres creada en Dokploy.
- Variables de entorno vía panel: `DATABASE_URL`, `JWT_SECRET`, `PORT`.
- HTTPS automático con el subdominio que asigna Dokploy.
- `prisma migrate deploy` + `create-user`/migración como pasos post-deploy.

## Pruebas y manejo de errores

- **Vitest + supertest**: tests de integración de servicios y rutas (CRUD de periodos/ingresos/gastos/deudas, cálculo de restante y progreso de deuda, auth). BD de prueba aislada.
- Middleware central de errores: responde `500 {error}` sin filtrar stack traces en producción.
- Validación de entrada en rutas (tipos, rangos, campos requeridos) antes de tocar la BD.

## Fuera de alcance (fase actual)

- Aplicaciones de escritorio y móviles (proyectos futuros).
- Multiusuario.
- UI administrativa/web de la API.