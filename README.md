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

## Despliegue (GitHub Actions + Dokploy)

El pipeline construye la imagen y la publica en el GHCR de tu organización (`ghcr.io/<repo>/finanzas-api`), y luego le ordena a Dokploy redesplegar jalandola. Dokploy **no** construye desde el repo.

1. Sube el proyecto a GitHub.
2. En **Dokploy**, crea una aplicación de tipo Docker que apunte a la imagen:
   - Imagen: `ghcr.io/<tu-usuario>/finanzas-api:main`
   - Credenciales del registry: tu usuario de GitHub + un token con permiso `read:packages`.
   - **Apaga el auto-deploy por Git** (si sigue encendido, Dokploy despliega por su cuenta al detectar el push, saltándose el pipeline).
3. Crea una base de datos PostgreSQL en Dokploy (o reutiliza la existente).
4. En **GitHub** (Settings → Environments → `production`), define los secrets:
   - `DOKPLOY_URL` (la URL de tu instancia Dokploy)
   - `DOKPLOY_API_KEY` (token API de Dokploy)
   - `DOKPLOY_APPLICATION_ID` (ID de la aplicación creada en Dokploy)
5. En el panel de Dokploy, asigna el subdominio (HTTPS automático) y las variables de entorno del contenedor:
   - `DATABASE_URL` (conexión a la BD)
   - `JWT_SECRET` (secreto largo aleatorio)
   - `PORT` (3000)
6. Tras el primer deploy, aplica las migraciones y crea tu usuario:

   ```bash
   npx prisma migrate deploy
   npm run create-user -- --email=tu@email.com --password=tu-password
   ```

7. (Opcional) Migra tu historial: `npm run migrate:sqlite`.

Cada push a `main` corre el gate de calidad (typecheck + tests sobre un Postgres efímero), construye la imagen, la publica en GHCR y dispara el redeploy en Dokploy. Para rollback, apunta Dokploy al tag inmutable `sha-xxxxxxx` de la versión anterior y redespliega.

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
