import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.client.count();
  if (count > 0) {
    console.log(`Database has ${count} client(s) — skipping seed.`);
    return;
  }

  console.log('Empty database — running prisma db seed...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
  console.log('Seed completed.');
}

main()
  .catch((err) => {
    console.error('Seed check failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
