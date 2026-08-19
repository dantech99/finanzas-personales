import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

const TEST_DB = "finanzas_test";

function replaceDbName(url: string, dbName: string): string {
  const idx = url.lastIndexOf("/");
  return `${url.slice(0, idx + 1)}${dbName}`;
}

function adminUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const dbUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/finanzas";
  return replaceDbName(dbUrl, "postgres");
}

export default async function setup() {
  const ADMIN_URL = adminUrl();
  const client = new Client({ connectionString: ADMIN_URL });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await client.query(`CREATE DATABASE ${TEST_DB}`);
  await client.end();

  const testUrl = replaceDbName(ADMIN_URL, TEST_DB);
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "inherit",
  });
  process.env.DATABASE_URL = testUrl;
}