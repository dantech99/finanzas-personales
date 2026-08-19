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