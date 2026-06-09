require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('DATABASE_URL host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);
  const prisma = new PrismaClient({ log: ['error'] });
  try {
    const count = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log('DB OK:', count);
    const clients = await prisma.client.findMany();
    console.log('Clients:', clients.length);
  } catch (e) {
    console.error('DB ERROR:', e.code || e.name, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
