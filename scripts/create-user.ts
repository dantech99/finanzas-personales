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