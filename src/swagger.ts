import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Finanzas Personales API",
      version: "0.1.0",
      description:
        "API REST para gestionar finanzas personales: periodos, ingresos, gastos y deudas.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Usuario: {
          type: "object",
          properties: {
            id: { type: "integer" },
            email: { type: "string" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
          },
        },
        Periodo: {
          type: "object",
          properties: {
            id: { type: "integer" },
            mes: { type: "string" },
            anio: { type: "integer" },
          },
        },
        CreatePeriodoRequest: {
          type: "object",
          required: ["mes", "anio"],
          properties: {
            mes: { type: "string" },
            anio: { type: "integer" },
          },
        },
        PeriodoResumen: {
          type: "object",
          properties: {
            mes: { type: "string" },
            anio: { type: "integer" },
            totalIngresos: { type: "integer" },
            totalGastos: { type: "integer" },
            totalPendiente: { type: "integer" },
            restante: { type: "integer" },
          },
        },
        Ingreso: {
          type: "object",
          properties: {
            id: { type: "integer" },
            fuente: { type: "string" },
            valor: { type: "integer" },
            periodoId: { type: "integer" },
          },
        },
        CreateIngresoRequest: {
          type: "object",
          required: ["fuente", "valor"],
          properties: {
            fuente: { type: "string" },
            valor: { type: "integer" },
          },
        },
        UpdateIngresoRequest: {
          type: "object",
          properties: {
            fuente: { type: "string" },
            valor: { type: "integer" },
          },
        },
        Gasto: {
          type: "object",
          properties: {
            id: { type: "integer" },
            concepto: { type: "string" },
            valor: { type: "integer" },
            nota: { type: "string", nullable: true },
            pagado: { type: "boolean" },
            deudaId: { type: "integer", nullable: true },
            periodoId: { type: "integer" },
          },
        },
        CreateGastoRequest: {
          type: "object",
          required: ["concepto", "valor"],
          properties: {
            concepto: { type: "string" },
            valor: { type: "integer" },
            nota: { type: "string" },
            pagado: { type: "boolean", default: false },
            deudaId: { type: "integer" },
          },
        },
        UpdateGastoRequest: {
          type: "object",
          properties: {
            concepto: { type: "string" },
            valor: { type: "integer" },
            nota: { type: "string" },
            pagado: { type: "boolean" },
            deudaId: { type: "integer" },
          },
        },
        Deuda: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombre: { type: "string" },
            montoTotal: { type: "integer" },
            descripcion: { type: "string", nullable: true },
          },
        },
        DeudaConSaldo: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombre: { type: "string" },
            montoTotal: { type: "integer" },
            descripcion: { type: "string", nullable: true },
            abonado: { type: "integer" },
            pendiente: { type: "integer" },
            pct: { type: "integer" },
          },
        },
        CreateDeudaRequest: {
          type: "object",
          required: ["nombre", "montoTotal"],
          properties: {
            nombre: { type: "string" },
            montoTotal: { type: "integer" },
            descripcion: { type: "string" },
          },
        },
        Resumen: {
          type: "object",
          properties: {
            totalIngresos: { type: "integer" },
            totalGastos: { type: "integer" },
            totalPendiente: { type: "integer" },
            restante: { type: "integer" },
            ingresos: {
              type: "array",
              items: { $ref: "#/components/schemas/Ingreso" },
            },
            gastos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  concepto: { type: "string" },
                  valor: { type: "integer" },
                  nota: { type: "string", nullable: true },
                  pagado: { type: "boolean" },
                  deudaId: { type: "integer", nullable: true },
                  deudaNombre: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);