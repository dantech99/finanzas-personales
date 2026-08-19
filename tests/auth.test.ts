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
});