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
